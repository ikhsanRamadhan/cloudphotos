import { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, StatusBar, useColorScheme } from "react-native";
import { colors } from "../utils/colors";

type ThemeContextType = {
    currentTheme: string;
    isSystemTheme: boolean;
    textColor: string;
    bgColor: string;
    toggleTheme: (newTheme: string) => void;
    useSystemTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
    currentTheme: "Light",
    isSystemTheme: false,
    textColor: "#171617",
    bgColor: "#ffffff",
    toggleTheme: () => {},
    useSystemTheme: () => {},
});

export default function ThemeProvider({ children }: PropsWithChildren) {
    const colorScheme = useColorScheme();
    const [theme, setTheme] = useState<string>(colorScheme as string);
    const [systemTheme, setSystemTheme] = useState<boolean>(false);
    const textColor = theme === 'dark' ? colors.white : colors.black;
    const bgColor = theme === 'dark' ? colors.dark : colors.light;

    useEffect(() => {
        const getTheme = async () => {
            try {
                const storedThemeObject = await AsyncStorage.getItem('theme');
                const storedThemeData = JSON.parse(storedThemeObject!);
                if (storedThemeData) {
                    setTheme(storedThemeData.mode);
                    setSystemTheme(storedThemeData.system);
                }
            } catch (e) {
                console.log('Error retrieving theme:', e);
            }
        };
        getTheme();
    }, []);

    useEffect(() => {
        if (colorScheme && systemTheme) {
            const themeObject = {
                mode: colorScheme,
                system: true
            };

            AsyncStorage.setItem('theme', JSON.stringify(themeObject));
            setTheme(colorScheme);
            setSystemTheme(true);
        }
    }, [colorScheme, systemTheme]);

    useEffect(() => {
        StatusBar.setBarStyle(theme=== 'dark' ? 'light-content' : 'dark-content');

        if (Platform.OS === 'android') {
            StatusBar.setBackgroundColor(theme=== 'dark' ? colors.dark : colors.white);
            StatusBar.setTranslucent(false);
        }
    }, [theme]);

    const toggleTheme = (newTheme: string) => {
        const themeObject = {
            mode: newTheme,
            system: false
        };

        AsyncStorage.setItem('theme', JSON.stringify(themeObject));
        setTheme(newTheme);
        setSystemTheme(false);
    };

    const useSystemTheme = () => {
        if (colorScheme) {
            const themeObject = {
                mode: colorScheme,
                system: true
            };

            AsyncStorage.setItem('theme', JSON.stringify(themeObject));
            setTheme(colorScheme);
            setSystemTheme(true);
        }
    };

    return (
        <ThemeContext.Provider 
            value={{ 
                currentTheme: theme,
                isSystemTheme: systemTheme,
                textColor,
                bgColor,
                toggleTheme,
                useSystemTheme
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);