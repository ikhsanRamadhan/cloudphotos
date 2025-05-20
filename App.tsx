import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { enableScreens } from 'react-native-screens';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { LogBox } from 'react-native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import ThemeProvider from './providers/ThemeProvider';
import AuthProvider from './providers/AuthProvider';
import MediaProvider from './providers/MediaProvider';

import Navigation from './Navigation';

enableScreens();
LogBox.ignoreAllLogs(true);

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <MediaProvider>
            <PaperProvider>
              <GestureHandlerRootView>
                <BottomSheetModalProvider>
                  <NavigationContainer>
                    <Navigation />
                  </NavigationContainer>
                </BottomSheetModalProvider>
              </GestureHandlerRootView>
            </PaperProvider>
            <StatusBar style="auto" />
          </MediaProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};