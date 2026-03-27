import type { UUID, ZoneFeature } from "../contracts/backend-api.types.js";

export interface ZoneRepository {
  listByOrganization(organizationId: UUID): ZoneFeature[];
  findById(organizationId: UUID, zoneId: string): ZoneFeature | null;
  create(organizationId: UUID, feature: ZoneFeature): ZoneFeature;
  update(organizationId: UUID, zoneId: string, feature: ZoneFeature): ZoneFeature | null;
  delete(organizationId: UUID, zoneId: string): ZoneFeature | null;
}

const zoneStore = new Map<UUID, ZoneFeature[]>();

export class InMemoryZoneRepository implements ZoneRepository {
  listByOrganization(organizationId: UUID): ZoneFeature[] {
    return [...(zoneStore.get(organizationId) ?? [])];
  }

  findById(organizationId: UUID, zoneId: string): ZoneFeature | null {
    return (
      zoneStore.get(organizationId)?.find((zone) => String(zone.id) === zoneId) ?? null
    );
  }

  create(organizationId: UUID, feature: ZoneFeature): ZoneFeature {
    const zones = zoneStore.get(organizationId) ?? [];
    const id = String(feature.id ?? `zone-${Date.now()}-${Math.floor(Math.random() * 10_000)}`);
    const storedZone: ZoneFeature = { ...feature, id };
    zones.push(storedZone);
    zoneStore.set(organizationId, zones);
    return storedZone;
  }

  update(organizationId: UUID, zoneId: string, feature: ZoneFeature): ZoneFeature | null {
    const zones = zoneStore.get(organizationId) ?? [];
    const index = zones.findIndex((zone) => String(zone.id) === zoneId);
    if (index < 0) return null;

    const updatedZone: ZoneFeature = { ...feature, id: zoneId };
    zones[index] = updatedZone;
    zoneStore.set(organizationId, zones);
    return updatedZone;
  }

  delete(organizationId: UUID, zoneId: string): ZoneFeature | null {
    const zones = zoneStore.get(organizationId) ?? [];
    const index = zones.findIndex((zone) => String(zone.id) === zoneId);
    if (index < 0) return null;

    const [removed] = zones.splice(index, 1);
    zoneStore.set(organizationId, zones);
    return removed ?? null;
  }
}
