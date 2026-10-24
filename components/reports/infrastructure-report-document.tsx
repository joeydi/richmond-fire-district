"use client";

import { format } from "date-fns";
import {
  Document,
  Font,
  Image,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  INFRASTRUCTURE_COLORS,
  INFRASTRUCTURE_STATUS_LABELS,
  type InfrastructureStatus,
} from "@/lib/types/infrastructure";
import { REPORT_MAP_ASPECT_RATIO } from "@/lib/pdf/map-bounds";
import type {
  InfrastructureReportData,
  ReportPoint,
} from "@/lib/actions/infrastructure-report";

const REPORT_TITLE = "Infrastructure Report";
/** Letter width (612pt) less the page's horizontal padding. */
const PAGE_PADDING_X = 48;
const CONTENT_WIDTH = 612 - PAGE_PADDING_X * 2;
const ORGANIZATION = "Richmond Fire District #1 - WSID 5426";

// Colours are the Console design system's tokens, converted from oklch to
// hex for react-pdf.
const INK = "#18181b"; // foreground
const MUTED = "#5a5a64"; // muted-foreground
const FOOTNOTE = "#52525c"; // footnote (zinc-600)
const BORDER = "#e4e4e7"; // border
const SURFACE_MUTED = "#f4f4f5"; // muted
const BRAND = "#0092b8"; // brand

const STATUS_TONES: Record<InfrastructureStatus, { backgroundColor: string; color: string }> = {
  active: { backgroundColor: "#f0fdf4", color: "#016630" }, // status-good
  maintenance: { backgroundColor: "#fef3c6", color: "#973c00" }, // status-warning
  inactive: { backgroundColor: SURFACE_MUTED, color: "#3f3f46" }, // status-neutral
  unknown: { backgroundColor: SURFACE_MUTED, color: "#3f3f46" },
};

// Geist and Geist Mono, the design system's faces, served from public/fonts
// on the app's own origin so generating the PDF needs no third-party fetch.
const SANS = "Geist";
const MONO = "Geist Mono";

Font.register({
  family: SANS,
  fonts: [
    { src: "/fonts/Geist-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/Geist-Medium.ttf", fontWeight: 500 },
    { src: "/fonts/Geist-SemiBold.ttf", fontWeight: 600 },
  ],
});
Font.register({
  family: MONO,
  fonts: [
    { src: "/fonts/GeistMono-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/GeistMono-Medium.ttf", fontWeight: 500 },
  ],
});

/** The design system's mono uppercase label (eyebrow) */
const eyebrow = {
  fontFamily: MONO,
  fontSize: 7,
  letterSpacing: 0.6,
  textTransform: "uppercase" as const,
  color: MUTED,
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: PAGE_PADDING_X,
    fontFamily: SANS,
    fontSize: 10,
    color: INK,
  },
  cover: {
    marginBottom: 16,
  },
  wordmark: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  wordmarkText: {
    marginLeft: 5,
    fontFamily: MONO,
    fontWeight: 500,
    fontSize: 8.5,
    letterSpacing: 0.3,
  },
  coverOrg: {
    ...eyebrow,
  },
  coverTitle: {
    marginTop: 4,
    fontSize: 22,
    fontFamily: SANS,
    fontWeight: 600,
    letterSpacing: -0.2,
  },
  coverMeta: {
    marginTop: 6,
    fontFamily: MONO,
    fontSize: 8,
    textTransform: "uppercase",
    color: FOOTNOTE,
  },
  statBand: {
    flexDirection: "row",
    marginTop: 14,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
  },
  statCell: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  statCellLast: {
    borderRightWidth: 0,
  },
  statValue: {
    marginTop: 3,
    fontFamily: MONO,
    fontWeight: 500,
    fontSize: 16,
    letterSpacing: -0.3,
  },
  mapImage: {
    width: CONTENT_WIDTH,
    // Derived from the capture size so the image can never be squeezed.
    height: CONTENT_WIDTH / REPORT_MAP_ASPECT_RATIO,
    objectFit: "cover",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
  },
  mapCredit: {
    marginTop: 4,
    fontFamily: MONO,
    fontSize: 6.5,
    color: MUTED,
    textAlign: "right",
  },
  mapLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginBottom: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  legendParcel: {
    width: 12,
    height: 0,
    borderTopWidth: 1.5,
    // Matches the parcel line colour in components/map/parcels-layer.tsx
    borderTopColor: "#60A5FA",
    marginRight: 5,
  },
  legendLabel: {
    fontSize: 9,
    color: MUTED,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  swatch: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 7,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: SANS,
    fontWeight: 600,
    letterSpacing: -0.2,
  },
  sectionCount: {
    ...eyebrow,
    marginLeft: "auto",
  },
  card: {
    marginBottom: 8,
    padding: 10,
    paddingBottom: 2,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 11,
    fontFamily: SANS,
    fontWeight: 600,
  },
  chip: {
    marginLeft: "auto",
    paddingVertical: 1.5,
    paddingHorizontal: 4,
    borderRadius: 2,
    fontFamily: MONO,
    fontWeight: 500,
    fontSize: 6.5,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  detail: {
    width: "33.33%",
    marginBottom: 8,
    paddingRight: 10,
  },
  detailLabel: {
    ...eyebrow,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 10,
  },
  detailMono: {
    fontFamily: MONO,
    fontSize: 9.5,
  },
  notes: {
    marginTop: 2,
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  notesBody: {
    fontSize: 10,
    lineHeight: 1.45,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 2,
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
    borderColor: BORDER,
    borderRadius: 4,
  },
  emptyNote: {
    fontSize: 9,
    color: MUTED,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: PAGE_PADDING_X,
    right: PAGE_PADDING_X,
    flexDirection: "row",
    justifyContent: "space-between",
    fontFamily: MONO,
    fontSize: 7,
    textTransform: "uppercase",
    color: MUTED,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 6,
  },
});

interface InfrastructureReportDocumentProps {
  data: InfrastructureReportData;
  /** Captured overview map as a data URL; omitted or null renders no map page. */
  mapImage?: string | null;
}

export function InfrastructureReportDocument({
  data,
  mapImage,
}: InfrastructureReportDocumentProps) {
  const generatedAt = new Date(data.generatedAt);

  const stats = [
    { label: "Active points", value: data.totalPoints },
    { label: "Categories", value: data.groups.length },
    { label: "Photos", value: data.totalImages },
  ];

  const cover = (
    <View style={styles.cover}>
      <View style={styles.wordmark}>
        <DropletMark />
        <Text style={styles.wordmarkText}>RFD / WATER</Text>
      </View>
      <Text style={styles.coverOrg}>{ORGANIZATION}</Text>
      <Text style={styles.coverTitle}>{REPORT_TITLE}</Text>
      <Text style={styles.coverMeta}>
        Data as of {format(generatedAt, "MMM d, yyyy · h:mm a")}
      </Text>

      <View style={styles.statBand}>
        {stats.map((stat, i) => (
          <View
            key={stat.label}
            style={[styles.statCell, i === stats.length - 1 ? styles.statCellLast : {}]}
          >
            <Text style={styles.detailLabel}>{stat.label}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <Document
      title={`${ORGANIZATION} ${REPORT_TITLE}`}
      author={ORGANIZATION}
      subject="Active water system infrastructure"
    >
      {mapImage ? (
        <Page size="LETTER" style={styles.page}>
          {cover}
          <MapOverview mapImage={mapImage} groups={data.groups} />
          <ReportFooter />
        </Page>
      ) : null}

      <Page size="LETTER" style={styles.page}>
        {mapImage ? null : cover}

        {data.groups.map((group) => {
          const [first, ...rest] = group.points;
          return (
            <View key={group.type}>
              {/* The header travels with the first card so it is never
                  stranded at the foot of a page. When that card can break
                  across pages, minPresenceAhead keeps at least its summary
                  under the header. */}
              <View wrap={first ? cardWraps(first) : false}>
                <View style={styles.sectionHeader} wrap={false} minPresenceAhead={90}>
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: INFRASTRUCTURE_COLORS[group.type] },
                    ]}
                  />
                  <Text style={styles.sectionTitle}>{plain(group.label)}</Text>
                  <Text style={styles.sectionCount}>
                    {group.points.length} {pluralize(group.points.length, "point")}
                  </Text>
                </View>

                {first ? <PointCard point={first} typeLabel={group.label} /> : null}
              </View>

              {rest.map((point) => (
                <PointCard key={point.id} point={point} typeLabel={group.label} />
              ))}
            </View>
          );
        })}

        <ReportFooter />
      </Page>
    </Document>
  );
}

/** Lucide's Droplet, the design system's mark */
function DropletMark() {
  return (
    <Svg width={11} height={11} viewBox="0 0 24 24">
      <Path
        d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"
        fill="none"
        stroke={BRAND}
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ReportFooter() {
  return (
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
  );
}

function MapOverview({
  mapImage,
  groups,
}: {
  mapImage: string;
  groups: InfrastructureReportData["groups"];
}) {
  return (
    <View>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, not an <img> */}
      <Image style={styles.mapImage} src={mapImage} />

      {/* Mapbox requires attribution on exported imagery, and the map's own
          attribution control is DOM so it is absent from the capture. */}
      <Text style={styles.mapCredit}>© Mapbox © OpenStreetMap</Text>

      <View style={styles.mapLegend}>
        {groups.map((group) => (
          <View key={group.type} style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: INFRASTRUCTURE_COLORS[group.type] },
              ]}
            />
            <Text style={styles.legendLabel}>{plain(group.label)}</Text>
          </View>
        ))}

        <View style={styles.legendItem}>
          <View style={styles.legendParcel} />
          <Text style={styles.legendLabel}>Parcel boundary</Text>
        </View>
      </View>
    </View>
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
    <View style={styles.card} wrap={cardWraps(point)}>
      <View wrap={false}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{plain(point.name)}</Text>
          <Text style={[styles.chip, STATUS_TONES[point.status]]}>
            {INFRASTRUCTURE_STATUS_LABELS[point.status]}
          </Text>
        </View>

        <View style={styles.detailGrid}>
          <View style={styles.detail}>
            <Text style={styles.detailLabel}>Type</Text>
            <Text style={styles.detailValue}>{plain(typeLabel)}</Text>
          </View>
          <View style={styles.detail}>
            <Text style={styles.detailLabel}>Latitude</Text>
            <Text style={styles.detailMono}>{point.latitude.toFixed(6)}</Text>
          </View>
          <View style={styles.detail}>
            <Text style={styles.detailLabel}>Longitude</Text>
            <Text style={styles.detailMono}>{point.longitude.toFixed(6)}</Text>
          </View>
        </View>

      </View>

      {/* Notes stay outside the atomic block: they are free text of any length
          and must be able to flow across a page break on their own. */}
      {notes ? (
        <View style={styles.notes}>
          <Text style={styles.detailLabel}>Notes</Text>
          <Text style={styles.notesBody}>{plain(notes)}</Text>
        </View>
      ) : null}

      {point.images.length === 0 ? (
        <View style={styles.notes}>
          <Text style={styles.emptyNote}>{plain("No photos on file.")}</Text>
        </View>
      ) : null}

      {point.images.length > 0 ? (
        <View style={styles.photoGrid}>
          {point.images.map((image) => (
            <View key={image.id} style={styles.photoCell} wrap={false}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, not an <img> */}
              <Image style={styles.photo} src={image.url} />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Breaks Geist's ff, fi and fl ligatures with a zero-width non-joiner.
 * react-pdf always applies them and maps each ligature glyph back to one
 * character, so "Shutoff" would copy and search as "Shutof".
 */
function plain(text: string) {
  return text.replace(/f(?=[fil])/g, "f\u200C");
}

/** Whether a point's card may break across pages: long ones only */
function cardWraps(point: ReportPoint) {
  return point.images.length > 2 || Boolean(point.notes?.trim());
}

function pluralize(count: number, noun: string) {
  if (count === 1) return noun;
  return noun.endsWith("y") ? `${noun.slice(0, -1)}ies` : `${noun}s`;
}
