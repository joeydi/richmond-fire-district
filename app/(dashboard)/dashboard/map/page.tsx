import { getInfrastructurePoints } from "@/lib/actions/map";
import { getInfrastructurePointDetails } from "@/lib/actions/infrastructure";
import { isAdmin } from "@/lib/auth/roles";
import { MapView } from "./map-view";

interface MapPageProps {
  searchParams: Promise<{ point?: string }>;
}

export default async function MapPage({ searchParams }: MapPageProps) {
  const { point } = await searchParams;
  const [infrastructurePoints, userIsAdmin, details] = await Promise.all([
    getInfrastructurePoints(),
    isAdmin(),
    point ? getInfrastructurePointDetails(point) : null,
  ]);

  return <MapView infrastructurePoints={infrastructurePoints} isAdmin={userIsAdmin} details={details} />;
}
