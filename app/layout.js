import localFont from "next/font/local";
import "./globals.css";
import ReduxProvider from "./redux/provider";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "react-hot-toast";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = {
  title: "ThirdEye360",
  description: "Interactive 360° street view experience",
};

export default function RootLayout({ children }) {
  return (
    <html lang='en'>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            <ReduxProvider>{children}</ReduxProvider>
          </AuthProvider>
          <Toaster
            position='bottom-center'
            toastOptions={{
              duration: 4000,
              success: {
                duration: 4000,
              },
              error: {
                duration: 5000,
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
