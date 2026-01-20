import { getInfrastructurePoints } from "@/lib/actions/map";
import { isAdmin } from "@/lib/auth/roles";
import { MapView } from "./map-view";

export default async function MapPage() {
  const [infrastructurePoints, userIsAdmin] = await Promise.all([
    getInfrastructurePoints(),
    isAdmin(),
  ]);

  return (
    <div className="flex h-full flex-col">
      <div className="relative min-h-0 flex-1">
        <MapView
          infrastructurePoints={infrastructurePoints}
          isAdmin={userIsAdmin}
        />
      </div>
    </div>
  );
}
