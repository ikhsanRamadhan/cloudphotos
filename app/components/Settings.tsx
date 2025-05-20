import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { colors } from '../../utils/colors';

type SettingsProps = {
    currentTheme: string,
    textColor: string,
    toggleTheme: (newTheme: string) => void
};

const Settings = ({ currentTheme, textColor, toggleTheme }: SettingsProps) => {
    return (
        <View style={styles.container}>
            <Text style={[styles.title, { color: textColor }]}>Theme Switch</Text>
            <View style={[styles.button, { backgroundColor: currentTheme === 'dark' ? colors.darkGray : colors.white }]}>
                <Text style={{ color: textColor}}>Dark Mode</Text>
                <Switch 
                    value={currentTheme === 'dark'} 
                    onValueChange={() => toggleTheme(currentTheme === 'light' ? 'dark' : 'light')}
                />
            </View>
            <Text style={[styles.title2, { color: textColor }]}>Theme Settings</Text>
        </View>
    )
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: 600,
        marginTop: 10,
        marginBottom: 20
    },
    title2: {
        fontSize: 18,
        fontWeight: 600,
        marginTop: 30
    },
    button: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.white,
        padding: 15,
        borderRadius: 10,
    }
});

export default Settings;