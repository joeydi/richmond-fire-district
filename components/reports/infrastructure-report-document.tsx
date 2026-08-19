"use client";

import { format } from "date-fns";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  INFRASTRUCTURE_COLORS,
  INFRASTRUCTURE_STATUS_LABELS,
} from "@/lib/types/infrastructure";
import type {
  InfrastructureReportData,
  ReportPoint,
} from "@/lib/actions/infrastructure-report";

const REPORT_TITLE = "Infrastructure Report";
const ORGANIZATION = "Richmond Fire District #1 - WSID 5426";

// react-pdf ships Helvetica; registering a web font would add a network fetch
// that can fail while generating in the browser.
const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#0f172a",
  },
  cover: {
    marginBottom: 28,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#0f172a",
  },
  coverOrg: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "#64748b",
  },
  coverTitle: {
    marginTop: 6,
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
  },
  coverMeta: {
    marginTop: 10,
    fontSize: 10,
    color: "#475569",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 7,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },
  sectionCount: {
    marginLeft: "auto",
    fontSize: 9,
    color: "#64748b",
  },
  card: {
    marginBottom: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    backgroundColor: "#f8fafc",
  },
  cardTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  detail: {
    width: "50%",
    marginBottom: 6,
    paddingRight: 10,
  },
  detailLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#64748b",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 10,
  },
  notes: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  notesBody: {
    fontSize: 10,
    lineHeight: 1.4,
    color: "#334155",
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    marginHorizontal: -4,
  },
  photoCell: {
    width: "50%",
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  photo: {
    width: "100%",
    height: 150,
    objectFit: "cover",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 3,
  },
  photoCaption: {
    marginTop: 3,
    fontSize: 7,
    color: "#94a3b8",
  },
  emptyNote: {
    fontSize: 9,
    fontStyle: "italic",
    color: "#94a3b8",
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#94a3b8",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 6,
  },
});

interface InfrastructureReportDocumentProps {
  data: InfrastructureReportData;
}

export function InfrastructureReportDocument({
  data,
}: InfrastructureReportDocumentProps) {
  const generatedAt = new Date(data.generatedAt);

  return (
    <Document
      title={`${ORGANIZATION} ${REPORT_TITLE}`}
      author={ORGANIZATION}
      subject="Active water system infrastructure"
    >
      <Page size="LETTER" style={styles.page}>
        <View style={styles.cover}>
          <Text style={styles.coverOrg}>{ORGANIZATION}</Text>
          <Text style={styles.coverTitle}>{REPORT_TITLE}</Text>
          <Text style={styles.coverMeta}>
            Generated {format(generatedAt, "MMMM d, yyyy 'at' h:mm a")}
          </Text>
          <Text style={styles.coverMeta}>
            {data.totalPoints} active {pluralize(data.totalPoints, "point")}
            {" across "}
            {data.groups.length} {pluralize(data.groups.length, "category")}
            {" · "}
            {data.totalImages} {pluralize(data.totalImages, "photo")}
          </Text>
        </View>

        {data.groups.map((group) => (
          <View key={group.type}>
            <View style={styles.sectionHeader} wrap={false}>
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: INFRASTRUCTURE_COLORS[group.type] },
                ]}
              />
              <Text style={styles.sectionTitle}>{group.label}</Text>
              <Text style={styles.sectionCount}>
                {group.points.length} {pluralize(group.points.length, "point")}
              </Text>
            </View>

            {group.points.map((point) => (
              <PointCard key={point.id} point={point} typeLabel={group.label} />
            ))}
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text>
            {ORGANIZATION} {"—"} {REPORT_TITLE}
          </Text>
          <Text
            fixed
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

function PointCard({
  point,
  typeLabel,
}: {
  point: ReportPoint;
  typeLabel: string;
}) {
  const notes = point.notes?.trim();

  return (
    // The card itself may break, so a point with many photos can run onto
    // further pages. The summary block below is atomic: without it react-pdf
    // will happily break between the title and the details, which leaves an
    // empty bordered stub at the foot of the page.
    <View style={styles.card}>
      <View wrap={false}>
        <Text style={styles.cardTitle}>{point.name}</Text>

        <View style={styles.detailGrid}>
          <View style={styles.detail}>
            <Text style={styles.detailLabel}>Type</Text>
            <Text style={styles.detailValue}>{typeLabel}</Text>
          </View>
          <View style={styles.detail}>
            <Text style={styles.detailLabel}>Status</Text>
            <Text style={styles.detailValue}>
              {INFRASTRUCTURE_STATUS_LABELS[point.status]}
            </Text>
          </View>
          <View style={styles.detail}>
            <Text style={styles.detailLabel}>Latitude</Text>
            <Text style={styles.detailValue}>{point.latitude.toFixed(6)}</Text>
          </View>
          <View style={styles.detail}>
            <Text style={styles.detailLabel}>Longitude</Text>
            <Text style={styles.detailValue}>{point.longitude.toFixed(6)}</Text>
          </View>
        </View>

      </View>

      {/* Notes stay outside the atomic block: they are free text of any length
          and must be able to flow across a page break on their own. */}
      {notes ? (
        <View style={styles.notes}>
          <Text style={styles.detailLabel}>Notes</Text>
          <Text style={styles.notesBody}>{notes}</Text>
        </View>
      ) : null}

      {point.images.length === 0 ? (
        <View style={styles.notes}>
          <Text style={styles.emptyNote}>No photos on file.</Text>
        </View>
      ) : null}

      {point.images.length > 0 ? (
        <View style={styles.photoGrid}>
          {point.images.map((image, index) => (
            <View key={image.id} style={styles.photoCell} wrap={false}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, not an <img> */}
              <Image style={styles.photo} src={image.url} />
              <Text style={styles.photoCaption}>
                Photo {index + 1} of {point.images.length}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function pluralize(count: number, noun: string) {
  if (count === 1) return noun;
  return noun.endsWith("y") ? `${noun.slice(0, -1)}ies` : `${noun}s`;
}
