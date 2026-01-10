import { getInfrastructurePoints } from "@/lib/actions/map";
import { isAdmin } from "@/lib/auth/roles";
import { MapView } from "./map-view";

export default async function MapPage() {
  const [infrastructurePoints, userIsAdmin] = await Promise.all([
    getInfrastructurePoints(),
    isAdmin(),
  ]);

  return (
    <div className="flex h-full flex-col space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">System Map</h1>
        <p className="mt-1 text-sm text-slate-600">
          Water system infrastructure overview
        </p>
      </div>
      <div className="relative min-h-0 flex-1">
        <MapView
          infrastructurePoints={infrastructurePoints}
          isAdmin={userIsAdmin}
        />
      </div>
    </div>
  );
}
