import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  FlatList,
} from "react-native";
import { libraryApi, Book, BookIssue } from "../api/libraryApi";
import { COLORS } from "@/shared/theme/colors";
import { ScreenWrapper } from "@/shared/ui/ScreenWrapper";

export const LibraryScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"catalog" | "mybooks">("catalog");
  const [books, setBooks] = useState<Book[]>([]);
  const [issues, setIssues] = useState<BookIssue[]>([]);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [booksData, issuesData] = await Promise.all([
        libraryApi.getBooks(),
        libraryApi.getMyIssuedBooks(),
      ]);
      setBooks(booksData);
      setIssues(issuesData);
    } catch (err) {
      console.error("Failed to load library data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredBooks = useMemo(() => {
    if (!search.trim()) return books;
    const q = search.trim().toLowerCase();
    return books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.isbn.toLowerCase().includes(q)
    );
  }, [books, search]);

  const isOverdue = (issue: BookIssue) =>
    !issue.returned_date && new Date(issue.due_date) < new Date();

  const renderBookItem = ({ item }: { item: Book }) => (
    <View style={styles.card}>
      <Text style={styles.bookTitle}>{item.title}</Text>
      <Text style={styles.metaText}>by {item.author}</Text>
      <View style={styles.divider} />
      <View style={styles.row}>
        <Text style={styles.metaText}>Publisher: {item.publisher || "—"}</Text>
        <View
          style={[
            styles.badge,
            item.available_copies > 0 ? styles.badgeAvailable : styles.badgeUnavailable,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              item.available_copies > 0 ? styles.textAvailable : styles.textUnavailable,
            ]}
          >
            {item.available_copies} / {item.total_copies} available
          </Text>
        </View>
      </View>
    </View>
  );

  const renderIssueItem = ({ item }: { item: BookIssue }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.bookTitle}>{item.book_title}</Text>
        {isOverdue(item) && (
          <View style={styles.badgeOverdue}>
            <Text style={styles.textOverdue}>OVERDUE</Text>
          </View>
        )}
      </View>
      <View style={styles.divider} />
      <Text style={styles.metaText}>Issued: {new Date(item.issued_date).toLocaleDateString()}</Text>
      <Text style={styles.metaText}>Due: {new Date(item.due_date).toLocaleDateString()}</Text>
      {item.returned_date ? (
        <Text style={styles.metaText}>Returned: {new Date(item.returned_date).toLocaleDateString()}</Text>
      ) : null}
      {Number(item.fine_amount) > 0 && (
        <Text style={styles.fineText}>Fine due: ₹{item.fine_amount}</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScreenWrapper title="Library" showHeader showBack style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "catalog" && styles.activeTabButton]}
          onPress={() => setActiveTab("catalog")}
        >
          <Text style={[styles.tabText, activeTab === "catalog" && styles.activeTabText]}>Catalog</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "mybooks" && styles.activeTabButton]}
          onPress={() => setActiveTab("mybooks")}
        >
          <Text style={[styles.tabText, activeTab === "mybooks" && styles.activeTabText]}>My Books</Text>
        </TouchableOpacity>
      </View>

      {activeTab === "catalog" ? (
        <>
          <View style={styles.searchWrapper}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by title, author, or ISBN"
              placeholderTextColor={COLORS.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <FlatList
            data={filteredBooks}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderBookItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<Text style={styles.emptyText}>No books found.</Text>}
          />
        </>
      ) : (
        <FlatList
          data={issues}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderIssueItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>You have no issued books.</Text>}
        />
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  tabContainer: {
    flexDirection: "row",
    padding: 16,
    paddingBottom: 8,
    gap: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
  },
  activeTabButton: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#475569",
  },
  activeTabText: {
    color: "#FFFFFF",
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  bookTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#0F172A",
    flex: 1,
  },
  metaText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeAvailable: {
    backgroundColor: "#DCFCE7",
  },
  badgeUnavailable: {
    backgroundColor: "#FEE2E2",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  textAvailable: {
    color: "#16A34A",
  },
  textUnavailable: {
    color: "#DC2626",
  },
  badgeOverdue: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  textOverdue: {
    color: "#DC2626",
    fontSize: 10,
    fontWeight: "bold",
  },
  fineText: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "600",
    marginTop: 6,
  },
  emptyText: {
    textAlign: "center",
    color: "#64748B",
    fontSize: 13,
    marginTop: 40,
  },
});

export default LibraryScreen;
