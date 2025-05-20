import { ScrollView, StyleSheet, Text } from 'react-native';
import { Modal, Portal, Button, } from 'react-native-paper';
import Feather from '@expo/vector-icons/Feather';

import { supabase } from '../../../utils/supabase';
import SettingButton from '../SettingButton';
import Settings from '../Settings';
import { useTheme } from '../../../providers/ThemeProvider';
import { colors } from '../../../utils/colors';

type UserModalProps = {
    visible: boolean;
    user: any;
    onDismiss: () => void;
};

function SettingsModal({ visible, user, onDismiss }: UserModalProps) {
    const { currentTheme, isSystemTheme, textColor, toggleTheme, useSystemTheme } = useTheme();
    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={onDismiss}
                contentContainerStyle={[
                    styles.modalContainer, 
                    { backgroundColor: currentTheme === 'dark' ? colors.dark : colors.gray }
                ]}
                
            >
                <Feather 
                    name="x" 
                    size={24} 
                    color={ textColor } 
                    className='absolute top-4 left-4' 
                    onPress={onDismiss}
                />
                <ScrollView>
                    <Text 
                        style={{ 
                            marginBottom: 8, 
                            marginTop: 30, 
                            textAlign: 'center', 
                            fontWeight: 'bold', 
                            fontSize: 18, 
                            color: textColor
                        }}
                    >
                        Account
                    </Text>

                    <Text 
                        style={{ 
                            marginBottom: 16, 
                            textAlign: 'center', 
                            color: textColor 
                        }}
                    >
                        Signed in as {user.email}
                    </Text>

                    <Button 
                        mode="contained" 
                        onPress={() => supabase.auth.signOut()} 
                        style={{ 
                            marginBottom: 8, 
                            backgroundColor: 'red', 
                            width: '35%', 
                            alignSelf: 'center',
                        }}
                        textColor='white'
                    >
                        Sign Out
                    </Button>

                    <Settings currentTheme={currentTheme} textColor={textColor} toggleTheme={toggleTheme} />

                    <SettingButton 
                        title='Light' 
                        icon='white-balance-sunny' 
                        onPress={() => toggleTheme('light')} 
                        isActive={!isSystemTheme && currentTheme === 'light'} 
                        currentTheme={currentTheme} 
                    />

                    <SettingButton 
                        title='Dark' 
                        icon='moon-waning-crescent' 
                        onPress={() => toggleTheme('dark')} 
                        isActive={!isSystemTheme && currentTheme === 'dark'} 
                        currentTheme={currentTheme} 
                    />

                    <SettingButton 
                        title='System' 
                        icon='theme-light-dark' 
                        onPress={() => useSystemTheme()} 
                        isActive={isSystemTheme} 
                        currentTheme={currentTheme} 
                    />
                </ScrollView>
            </Modal>
        </Portal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        padding: 20,
        margin: 20,
        borderRadius: 8,
    },
});

export default SettingsModal;