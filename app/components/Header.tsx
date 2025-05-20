import { Text, View } from 'react-native';
import React, { useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import SettingsModal from './Modal/SettingsModal';


const Header = () => {
    const { textColor, bgColor } = useTheme();
    const { user } = useAuth();
    const [visible, setVisible] = useState(false);

    return (
        <View 
            style={{ 
                backgroundColor: bgColor,
                width: '100%',
                height: 130,
            }}
        >
            <SettingsModal visible={visible} user={user} onDismiss={() => setVisible(false)} />
            <View 
                style={{ 
                    width: '100%', 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    marginTop: 60, 
                    justifyContent: 'space-between', 
                    paddingHorizontal: 10 
                }}
            >
                <Text
                    style={{ 
                        color: textColor,
                        fontSize: 22,
                        fontWeight: 'bold',
                        textAlign: 'center'
                    }}
                >
                    CloudPhotos
                </Text>

                <MaterialIcons
                    name="settings"
                    size={24}
                    color={textColor}
                    style={{ }}
                    onPress={() => setVisible(true)}
                />
            </View>
        </View>
    )
};

export default Header;