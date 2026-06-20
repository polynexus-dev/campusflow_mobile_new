import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { COLORS } from "@/shared/theme/colors";
import { Button } from "@/shared/ui/Button";
import { assignmentsApi } from "../api/assignmentsApi";

export const AssignmentDetailScreen: React.FC = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [assignment, setAssignment] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Submission Form State
  const [textSubmission, setTextSubmission] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [simulatedFile, setSimulatedFile] = useState<boolean>(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const assignData = await assignmentsApi.getAssignmentDetails(id);
      setAssignment(assignData);

      const subList = await assignmentsApi.getSubmissions(id);
      if (subList && subList.length > 0) {
        setSubmission(subList[0]);
      } else {
        setSubmission(null);
      }
    } catch (err: any) {
      Alert.alert("Error Loading Details", err.message || "Failed to retrieve assignment data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleSubmit = async () => {
    if (!textSubmission.trim() && !simulatedFile) {
      Alert.alert("Submission Error", "Please provide either a text response or attach a file.");
      return;
    }

    setSubmitting(true);
    try {
      let fileInfo = undefined;
      if (simulatedFile) {
        fileInfo = {
          uri: "file://simulated_cache/homework.pdf",
          name: "homework.pdf",
          type: "application/pdf",
        };
      }
      
      await assignmentsApi.submitAssignment(id!, textSubmission, fileInfo);
      Alert.alert("Success", "Your assignment was submitted successfully!");
      loadData(); // reload to show the submission
    } catch (err: any) {
      Alert.alert("Submission Failed", err.message || "Could not submit assignment.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Fetching assignment details...</Text>
      </View>
    );
  }

  if (!assignment) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Assignment not found or has been deleted.</Text>
        <Button title="Go Back" onPress={() => router.back()} style={styles.errorButton} />
      </View>
    );
  }

  const isPastDue = new Date(assignment.due_date) < new Date();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header / Nav */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Back to List</Text>
      </TouchableOpacity>

      {/* Assignment Header Card */}
      <View style={styles.detailCard}>
        <Text style={styles.courseCode}>{assignment.course_code}</Text>
        <Text style={styles.title}>{assignment.title}</Text>
        <Text style={styles.metaText}>Posted by: {assignment.created_by}</Text>
        <Text style={styles.metaText}>
          Due: {new Date(assignment.due_date).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </Text>
        
        <View style={styles.divider} />
        
        <Text style={styles.sectionLabel}>INSTRUCTIONS</Text>
        <Text style={styles.description}>{assignment.description}</Text>
        
        {assignment.attachment && (
          <TouchableOpacity 
            activeOpacity={0.8} 
            style={styles.attachmentButton}
            onPress={() => Alert.alert("Download Link", `Attachment available at: ${assignment.attachment}`)}
          >
            <Text style={styles.attachmentText}>📎 View Assignment Attachment</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Submission Status Section */}
      {submission ? (
        <View style={[styles.card, styles.submittedCard]}>
          <View style={styles.submittedHeader}>
            <Text style={styles.submittedTitle}>✓ Submissions Logs</Text>
            <View style={[
              styles.statusBadge, 
              submission.status === "graded" ? styles.statusBadgeGraded : styles.statusBadgeSubmitted
            ]}>
              <Text style={styles.statusBadgeText}>
                {submission.status.toUpperCase()}
              </Text>
            </View>
          </View>
          
          <Text style={styles.subMeta}>
            Submitted on: {new Date(submission.submitted_at).toLocaleDateString([], { month: "short", day: "numeric" })}
          </Text>

          {submission.text_submission ? (
            <View style={styles.responseContainer}>
              <Text style={styles.responseLabel}>Your Response:</Text>
              <Text style={styles.responseText}>{submission.text_submission}</Text>
            </View>
          ) : null}

          {submission.attachment && (
            <Text style={styles.responseFile}>📎 Attached file: {submission.attachment.split('/').pop()}</Text>
          )}

          {submission.status === "graded" ? (
            <View style={styles.gradeBox}>
              <Text style={styles.gradeTitle}>Grade / Marks Received</Text>
              <Text style={styles.gradeScore}>{submission.grade}</Text>
              {submission.feedback ? (
                <View style={styles.feedbackContainer}>
                  <Text style={styles.feedbackLabel}>Instructor Feedback:</Text>
                  <Text style={styles.feedbackText}>{submission.feedback}</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Text style={styles.pendingGradeText}>Waiting for review from faculty.</Text>
          )}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Submit Response</Text>
          
          {isPastDue ? (
            <View style={styles.pastDueContainer}>
              <Text style={styles.pastDueText}>⚠️ This assignment is overdue and cannot accept new submissions.</Text>
            </View>
          ) : (
            <View>
              <Text style={styles.inputLabel}>Written Response</Text>
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={6}
                placeholder="Type your homework answer or details here..."
                placeholderTextColor={COLORS.textMuted}
                value={textSubmission}
                onChangeText={setTextSubmission}
              />

              {/* File Attachment Mock Picker */}
              <Text style={styles.inputLabel}>File Upload (PDF/ZIP)</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.mockPicker, simulatedFile && styles.mockPickerActive]}
                onPress={() => setSimulatedFile(!simulatedFile)}
              >
                <Text style={styles.mockPickerText}>
                  {simulatedFile ? "✓ Attachment: homework.pdf (Tap to Remove)" : "📎 Add simulated homework.pdf file"}
                </Text>
              </TouchableOpacity>

              <Button
                title="Submit Homework"
                loading={submitting}
                onPress={handleSubmit}
                style={styles.submitButton}
              />
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 24,
    paddingTop: 52,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 20,
    paddingVertical: 4,
  },
  backButtonText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  errorButton: {
    width: 200,
  },
  detailCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.2,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  courseCode: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
    backgroundColor: "rgba(74, 21, 75, 0.12)", // Translucent purple matching primary
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 12,
  },
  metaText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  sectionLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  attachmentButton: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  attachmentText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 13,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.2,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16,
  },
  submittedCard: {
    backgroundColor: "rgba(16, 185, 129, 0.04)",
    borderColor: COLORS.success,
  },
  submittedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  submittedTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.success,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeSubmitted: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  statusBadgeGraded: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.success,
  },
  subMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  responseContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  responseLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "700",
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  responseFile: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "500",
    marginBottom: 16,
  },
  pendingGradeText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: "italic",
    marginTop: 8,
  },
  gradeBox: {
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  gradeTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  gradeScore: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.accent,
    textAlign: "center",
    marginVertical: 8,
  },
  feedbackContainer: {
    borderTopWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.2)",
    paddingTop: 10,
    marginTop: 8,
  },
  feedbackLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "700",
    marginBottom: 4,
  },
  feedbackText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  pastDueContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderColor: COLORS.error,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
  },
  pastDueText: {
    color: COLORS.error,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  inputLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "600",
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.2,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    color: COLORS.text,
    fontSize: 14,
    height: 120,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  mockPicker: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1.2,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 24,
  },
  mockPickerActive: {
    backgroundColor: "rgba(16, 185, 129, 0.05)",
    borderColor: COLORS.success,
    borderStyle: "solid",
  },
  mockPickerText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: COLORS.primary,
  },
});

export default AssignmentDetailScreen;
