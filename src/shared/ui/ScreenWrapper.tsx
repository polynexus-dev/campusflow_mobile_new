import { useBottomTabPadding } from "@/shared/hooks/useBottomTabPadding";
import { COLORS } from "@/shared/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React from "react";
import {
    Platform,
    Pressable,
    ScrollView,
    StyleProp,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
    title?: string;
    children: React.ReactNode;
    right?: React.ReactNode;
    showBack?: boolean;
    onBack?: () => void;
    showHeader?: boolean;
    screenBgColor?: string;
    headerBgColor?: string;
    titleColor?: string;
    iconColor?: string;
    blurTint?: "light" | "dark" | "default";
    scrollable?: boolean;
    contentContainerStyle?: StyleProp<ViewStyle>;
    style?: StyleProp<ViewStyle>;
    disablePadding?: boolean;
};

export function ScreenWrapper({
    title = "",
    children,
    right,
    showBack = false,
    onBack,
    showHeader = false,
    screenBgColor = COLORS.background,
    headerBgColor = COLORS.glass,
    titleColor = COLORS.text,
    iconColor = COLORS.text,
    blurTint = "light",
    scrollable = false,
    contentContainerStyle,
    style,
    disablePadding = false,
}: Props) {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const bottomPadding = useBottomTabPadding();
    const headerHeight = Platform.OS === "ios" ? insets.top + 50 : insets.top + 58;

    return (
        <View 
            style={[
                styles.container,
                { backgroundColor: screenBgColor },
                style
            ]}
        >
            {showHeader && (
                <View
                    style={[
                        styles.header,
                        {
                            paddingTop: Platform.OS === "ios"
                                ? insets.top + 12
                                : insets.top + 16,
                            paddingBottom: Platform.OS === "ios"
                                ? 12
                                : 16,
                        },
                    ]}
                >
                    {/* Frosted background blur overlay */}
                    <View
                        style={[
                            StyleSheet.absoluteFill,
                            {
                                backgroundColor: headerBgColor
                                    ? (headerBgColor.startsWith("#") && headerBgColor.length === 7
                                        ? `${headerBgColor}d9`
                                        : headerBgColor)
                                    : "rgba(255, 255, 255, 0.85)",
                            },
                        ]}
                    />
                    <BlurView tint={blurTint} intensity={65} style={StyleSheet.absoluteFill} />

                    <View style={styles.side}>
                        {showBack && (
                            <Pressable onPress={() => onBack ? onBack() : router.back()} hitSlop={10}>
                                <Ionicons
                                    name="chevron-back"
                                    size={26}
                                    color={iconColor}
                                />
                            </Pressable>
                        )}
                    </View>

                    <Text numberOfLines={1} style={[styles.title, { color: titleColor }]}>
                        {title}
                    </Text>

                    <View style={[styles.side, styles.rightSide]}>
                        {right}
                    </View>
                </View>
            )}

            {scrollable ? (
                <ScrollView
                    style={styles.content}
                    contentContainerStyle={[
                        contentContainerStyle, 
                        !disablePadding && { 
                            paddingBottom: bottomPadding,
                            paddingTop: showHeader ? headerHeight : insets.top + 16,
                        }
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    {children}
                </ScrollView>
            ) : (
                <View 
                    style={[
                        { flex: 1 },
                        !disablePadding && { 
                            paddingTop: showHeader ? headerHeight : insets.top + 16,
                            paddingBottom: bottomPadding,
                        }
                    ]}
                >
                    {children}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    header: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: "transparent",
    },

    title: {
        flex: 1,
        textAlign: "center",
        fontSize: 18,
        fontWeight: "600",
    },

    side: {
        width: 60,
        justifyContent: "center",
    },

    rightSide: {
        alignItems: "flex-end",
    },

    content: {
        flex: 1,
    }
});
