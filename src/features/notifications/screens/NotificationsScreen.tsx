import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl } from "react-native";
import { notificationsApi, AppNotification } from "../api/notificationsApi";
import { COLORS } from "@/shared/theme/colors";
import { ScreenWrapper } from "@/shared/ui/ScreenWrapper";
import { listStyles as s, errorMessage } from "@/shared/ui/listStyles";

const timeAgo = (iso: string) => {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
};

export const NotificationsScreen: React.FC = () => {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setItems(await notificationsApi.list());
    } catch (err) {
      setError(errorMessage(err, "Couldn't load notifications."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const markRead = async (n: AppNotification) => {
    if (n.is_read) return;
    setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, is_read: true } : i)));
    try {
      await notificationsApi.markRead(n.id);
    } catch {
      setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, is_read: false } : i)));
    }
  };

  // No bulk endpoint on the backend, so mark each unread item.
  const markAllRead = async () => {
    const unread = items.filter((i) => !i.is_read);
    setItems((prev) => prev.map((i) => ({ ...i, is_read: true })));
    await Promise.allSettled(unread.map((n) => notificationsApi.markRead(n.id)));
  };

  const renderItem = ({ item }: { item: AppNotification }) => (
    <TouchableOpacity
      style={[s.card, !item.is_read && { borderColor: COLORS.secondary, backgroundColor: "#FBF7FC" }]}
      activeOpacity={0.8}
      onPress={() => markRead(item)}
    >
      <View style={s.row}>
        {!item.is_read && (
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary }} />
        )}
        <Text style={s.title}>{item.title}</Text>
        <Text style={s.meta}>{timeAgo(item.created_at)}</Text>
      </View>
      {item.body ? <Text style={[s.meta, { marginTop: 6 }]}>{item.body}</Text> : null}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const hasUnread = items.some((i) => !i.is_read);

  return (
    <ScreenWrapper
      title="Notifications"
      showHeader
      showBack
      style={s.container}
      right={
        hasUnread ? (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={{ color: COLORS.primary, fontWeight: "bold", fontSize: 13 }}>Mark all read</Text>
          </TouchableOpacity>
        ) : undefined
      }
    >
      {error ? (
        <Text style={s.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={[s.listContent, { paddingTop: 16 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
          ListEmptyComponent={<Text style={s.emptyText}>You're all caught up.</Text>}
        />
      )}
    </ScreenWrapper>
  );
};

export default NotificationsScreen;
