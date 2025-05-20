import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { colors } from '../../utils/colors';
import { useTheme } from '../../providers/ThemeProvider';

type SettingButtonProps = {
    title: string,
    icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'],
    onPress: () => void,
    isActive: boolean,
    currentTheme: string,
};

const SettingButton = ({title, icon, onPress, isActive, currentTheme}: SettingButtonProps) => {
    const { textColor } = useTheme();

    return (
        <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, { backgroundColor: currentTheme === 'dark' ? colors.darkGray : colors.white }]} onPress={onPress}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <MaterialCommunityIcons name={icon} size={20} color={ textColor } />
                    <Text style={[styles.buttonTitle, { color: textColor }]}>{title}</Text>
                </View>
                <MaterialCommunityIcons 
                    name={isActive ? "check-circle" : "checkbox-blank-circle-outline"}
                    size={20} 
                    color={isActive ? colors.btnRight : textColor} />
            </TouchableOpacity>
        </View>
    )
};

export default SettingButton;

const styles = StyleSheet.create({
    buttonContainer: {
        marginHorizontal: 20,
    },
    button: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        borderRadius: 10,
        padding: 15
    },
    buttonTitle: {
        fontSize: 14,
        fontWeight: 500,
    }
});