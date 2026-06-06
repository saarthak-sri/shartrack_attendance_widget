import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import {BarChart} from 'react-native-chart-kit'
import axios from 'axios';
import { DOMParser } from 'react-native-html-parser';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = 'https://student.sharda.ac.in';

export default function App() {
  const [systemId, setSystemId] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'login' | 'otp' | 'attendance'>('login');
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [storedSession, setStoredSession] = useState<string | null>(null);

  const extractAndStoreCookie = async (res: any, currentSystemId?: string) => {
    try {
      const headers = res.headers;
      if (!headers) return null;
      const setCookie = headers['set-cookie'] || headers['Set-Cookie'];
      if (!setCookie) return null;

      const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
      for (const cookie of cookies) {
        const match = cookie.match(/ci_session=([^;]+)/);
        if (match) {
          const value = match[1];
          setStoredSession(value);
          await AsyncStorage.setItem('ci_session', value);
          const sysId = currentSystemId || systemId;
          if (sysId) {
            await AsyncStorage.setItem('system_id', sysId);
          }
          return value;
        }
      }
    } catch (e) {
      console.error('Failed to extract and store cookie', e);
    }
    return null;
  };

  useEffect(() => {
    const restoreSession = async () => {
      try {
        setLoading(true);
        const savedSession = await AsyncStorage.getItem('ci_session');
        const savedSystemId = await AsyncStorage.getItem('system_id');
        
        if (savedSystemId) {
          setSystemId(savedSystemId);
        }

        if (savedSession) {
          setStoredSession(savedSession);
          const success = await fetchAttendance(savedSession);
          if (success) {
            setMessage('Session restored successfully');
            return;
          }
        }
        setStep('login');
      } catch (e) {
        console.error('Failed to restore session', e);
        setStep('login');
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  useEffect(() => {
    if (step !== 'attendance') return;

    const performScheduledFetch = async () => {
      try {
        const res = await axios.get(`${BASE}/admin/courses`, {
          withCredentials: true,
        });

        await extractAndStoreCookie(res);

        const parsed = parseAttendance(res.data);
        if (parsed && parsed.length > 0) {
          setAttendance(parsed);
          setMessage('Attendance updated automatically');
          return;
        }
      } catch {
        // Ignore native fetch error and try manual restore next
      }

      if (storedSession) {
        setMessage('Restoring session...');
        const success = await fetchAttendance(storedSession);
        if (success) {
          setMessage('Attendance updated automatically (restored session)');
        } else {
          setMessage('Session expired. Please log in again.');
          setStep('login');
          await AsyncStorage.removeItem('ci_session');
        }
      } else {
        setMessage('Session expired. Please log in again.');
        setStep('login');
      }
    };

    const intervalId = setInterval(performScheduledFetch, 10000);

    return () => clearInterval(intervalId);
  }, [step, storedSession]);

  const sendOtp = async () => {
    try {
      setLoading(true);

      const form = new URLSearchParams();
      form.append('send_otp', '1');
      form.append('system_id', systemId);
      form.append('mode', '1');

      await axios.post(`${BASE}/studentlogin/sendotp`, form.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        withCredentials: true,
      });

      setStep('otp');
      setMessage('OTP Sent');
    } catch {
      setMessage('Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    try {
      setLoading(true);
      setMessage('');

      const form = new URLSearchParams();
      form.append('system_id', systemId);
      form.append('otp', otp);

      const res = await axios.post(`${BASE}/admin`, form.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        withCredentials: true,
      });

      const session = await extractAndStoreCookie(res);
      const success = await fetchAttendance(session || undefined);
      if (!success) {
        setMessage('Failed to load courses. Please try again.');
      }
    } catch {
      setMessage('Invalid OTP');
      setLoading(false);
    }
  };

  const fetchAttendance = async (sessionToUse?: string) => {
    try {
      setLoading(true);
      const activeSession = sessionToUse || storedSession;
      const headers: any = {};
      if (activeSession) {
        headers['Cookie'] = `ci_session=${activeSession}`;
      }

      const res = await axios.get(`${BASE}/admin/courses`, {
        headers,
        withCredentials: true,
      });

      await extractAndStoreCookie(res);

      const parsed = parseAttendance(res.data);
      if (parsed && parsed.length > 0) {
        setAttendance(parsed);
        setStep('attendance');
        return true;
      } else {
        return false;
      }
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  };

  const parseAttendance = (html: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const table = doc.getElementById('table1');

    if (!table) return [];

    const rows = table.getElementsByTagName('tr');
    let data = [];

    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].getElementsByTagName('td');
      if (cols.length < 11) continue;

      data.push({
        subject: cols[1].textContent?.trim(),
        code: cols[2].textContent?.trim(),
        delivered: cols[6].textContent?.trim(),
        attended: cols[7].textContent?.trim(),
        percentage: cols[10].textContent?.trim(),
      });
    }

    return data;
  };

const getOverallPercentage = () => {
  if (attendance.length === 0) return 0;

  let totalDelivered = 0;
  let totalAttended = 0;

  attendance.forEach((sub: any) => {
    totalDelivered += parseInt(sub.delivered || 0);
    totalAttended += parseInt(sub.attended || 0);
  });

  if (totalDelivered === 0) return 0;
  return Math.round((totalAttended / totalDelivered) * 100);
};


  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <Text style={styles.subject}>{item.subject}</Text>
      <Text>{item.attended}/{item.delivered}</Text>
      <Text style={styles.percent}>{item.percentage}</Text>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Attendance Tracker</Text>

      {step === 'login' && (
        <>
          <TextInput
            placeholder="System ID"
            value={systemId}
            onChangeText={setSystemId}
            style={styles.input}
          />
          <TouchableOpacity style={styles.button} onPress={sendOtp}>
            <Text style={styles.buttonText}>Send OTP</Text>
          </TouchableOpacity>
        </>
      )}

      {step === 'otp' && (
        <>
          <TextInput
            placeholder="Enter OTP"
            value={otp}
            onChangeText={setOtp}
            style={styles.input}
          />
          <TouchableOpacity style={styles.button} onPress={verifyOtp}>
            <Text style={styles.buttonText}>Verify OTP</Text>
          </TouchableOpacity>
        </>
      )}

      {loading && <ActivityIndicator size="large" color="#007bff" />}

      {step === 'attendance' && (
        <ScrollView>
          <Text style={styles.sectionTitle}>Overall Attendance</Text>
          <Text style={styles.overallPercent}>
            {getOverallPercentage()}%
          </Text>

          <Text style={styles.sectionTitle}>Subject-wise Attendance</Text>

          <BarChart
            data={{
              labels: attendance.map((s) => s.code),
              datasets: [
                {
                  data: attendance.map((s) =>
                    parseInt(s.percentage.replace('%', ''))
                  ),
                },
              ],
            }}
            width={Dimensions.get('window').width - 30}
            height={220}
            yAxisLabel=""
            yAxisSuffix="%"
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#f5f7fa',
              backgroundGradientTo: '#f5f7fa',
              decimalPlaces: 0,
              color: () => '#007bff',
              labelColor: () => '#333',
            }}
            style={{
              borderRadius: 16,
              marginVertical: 10,
            }}
          />

          <Text style={styles.sectionTitle}>Subjects</Text>

          {attendance.map((item, index) => (
            <View key={index} style={styles.card}>
              <Text style={styles.subject}>{item.subject}</Text>
              <Text>
                {item.attended}/{item.delivered}
              </Text>
              <Text style={styles.percent}>{item.percentage}</Text>
            </View>
          ))}
        </ScrollView>
      )}


      <Text style={styles.message}>{message}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#f5f7fa',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    elevation: 3,
  },
  subject: {
    fontWeight: 'bold',
  },
  percent: {
    color: '#28a745',
    fontWeight: 'bold',
  },
  message: {
    marginTop: 20,
    textAlign: 'center',
    color: 'red',
  },
sectionTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  marginTop: 20,
},

overallPercent: {
  fontSize: 48,
  fontWeight: 'bold',
  textAlign: 'center',
  color: '#007bff',
  marginVertical: 10,
},

});
