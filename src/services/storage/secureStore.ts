import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Keys holding credentials go to the OS keystore (Keychain / Android Keystore).
// Everything else (cached user JSON, tenant schema, device id) stays in
// AsyncStorage: it isn't secret, and SecureStore can reject values over ~2 KB.
// SecureStore doesn't exist on web, so web falls back to AsyncStorage.
const SECURE_KEYS = new Set(["cf_token", "cf_refresh"]);

const useSecureStore = (key: string) => SECURE_KEYS.has(key) && Platform.OS !== "web";

export const storage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (useSecureStore(key)) {
        await SecureStore.setItemAsync(key, value);
        // Remove any plaintext copy left by an older app version.
        await AsyncStorage.removeItem(key);
      } else {
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.error("Storage error setting key:", key, error);
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      if (!useSecureStore(key)) return await AsyncStorage.getItem(key);

      const value = await SecureStore.getItemAsync(key);
      if (value !== null) return value;

      // One-time migration: older builds saved the token in plain AsyncStorage.
      const legacy = await AsyncStorage.getItem(key);
      if (legacy !== null) {
        await SecureStore.setItemAsync(key, legacy);
        await AsyncStorage.removeItem(key);
      }
      return legacy;
    } catch (error) {
      console.error("Storage error getting key:", key, error);
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (useSecureStore(key)) await SecureStore.deleteItemAsync(key);
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error("Storage error removing key:", key, error);
    }
  },

  async clear(): Promise<void> {
    try {
      if (Platform.OS !== "web") {
        await Promise.all([...SECURE_KEYS].map((key) => SecureStore.deleteItemAsync(key)));
      }
      await AsyncStorage.clear();
    } catch (error) {
      console.error("Storage error clearing all storage", error);
    }
  },
};
