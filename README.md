# Attendance Tracker Mobile App

A React Native application for tracking student attendance from the Sharda University portal. This app is built on the same logic as the original Python script found in the `attendance tracker` folder.

## Features

- **OTP Login**: Secure login using System ID and OTP sent to the student's registered mobile number.
- **Attendance Fetching**: Automatically fetches attendance data from the Sharda University student portal.
- **Data Parsing**: Parses HTML table data into a clean, structured format.
- **Visual Analytics**: Displays subject-wise attendance in a bar chart for easy visualization.
- **Overall Attendance**: Calculates and displays the overall attendance percentage.

## Key Components

- **[App.tsx](file:///c:/shartr/mobile/App.tsx)**: The main application file containing the login flow, attendance fetching, and UI rendering.
- **Attendance Logic**: Follows the same scraping and parsing logic as the original [Python backend](file:///c:/shartr/attendance%20tracker/roott/backend/main.py).

## Tech Stack

- **Frontend**: React Native
- **Networking**: Axios
- **Parsing**: react-native-html-parser
- **Charts**: react-native-chart-kit
- **Styling**: React Native StyleSheet

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (>= 22.11.0)
- [React Native CLI](https://reactnative.dev/docs/environment-setup)
- Android Studio / Xcode for mobile development

### Installation

1.  Navigate to the `mobile` directory:
    ```bash
    cd mobile
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

### Running the App

1.  Start the Metro bundler:
    ```bash
    npm start
    ```
2.  Run on Android:
    ```bash
    npm run android
    ```
3.  Run on iOS:
    ```bash
    npm run ios
    ```

## Development

The app uses a `DOMParser` to extract attendance information from the student portal's HTML response. The logic can be found in the `parseAttendance` function within `App.tsx`.

