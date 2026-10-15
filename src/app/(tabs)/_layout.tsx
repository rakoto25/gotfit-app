import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { colors, fonts, shadow } from '@/theme';

const icons = {
  index: ['home', 'home-outline'],
  explore: ['compass', 'compass-outline'],
  planning: ['calendar', 'calendar-outline'],
  messages: ['chatbubble-ellipses', 'chatbubble-ellipses-outline'],
  profile: ['person', 'person-outline'],
} as const;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: '#8A948E',
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.tab,
        tabBarItemStyle: styles.item,
        tabBarIcon: ({ focused, color }) => {
          const pair = icons[route.name as keyof typeof icons] || icons.index;
          return (
            <Ionicons
              name={pair[focused ? 0 : 1]}
              size={focused ? 23 : 21}
              color={color}
            />
          );
        },
      })}>
      <Tabs.Screen name="index" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explorer' }} />
      <Tabs.Screen name="planning" options={{ title: 'Planning' }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tab: {
    position: 'absolute',
    height: 76,
    marginHorizontal: 14,
    marginBottom: 11,
    paddingTop: 7,
    paddingBottom: 7,
    borderRadius: 24,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: 'rgba(255,255,255,.985)',
    ...shadow,
  },
  item: { borderRadius: 18 },
  label: { fontFamily: fonts.bold, fontSize: 9, marginTop: 2, letterSpacing: 0.2 },
});
