import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import request from "supertest";

import { app } from "../../app.js";

function authHeader() {
  return { Authorization: "Bearer test-token" };
}

let autoZoneNameCounter = 0;

function buildPolygon(coords: number[][]) {
  autoZoneNameCounter += 1;
  return {
    type: "Feature" as const,
    properties: { name: `Test Zone ${autoZoneNameCounter}` },
    geometry: {
      type: "Polygon" as const,
      coordinates: [coords as [number, number][]],
    },
  };
}

function buildPolygonWithName(coords: number[][], name: string) {
  return {
    type: "Feature" as const,
    properties: { name },
    geometry: {
      type: "Polygon" as const,
      coordinates: [coords as [number, number][]],
    },
  };
}

test("POST /zones rejects invalid feature payload", async () => {
  const organizationId = randomUUID();
  const response = await request(app)
    .post("/zones")
    .set(authHeader())
    .send({ organizationId, feature: { nope: true } });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "Invalid zone geometry");
});

test("POST /zones auto-closes ring and GET /zones returns saved feature", async () => {
  const organizationId = randomUUID();
  const response = await request(app)
    .post("/zones")
    .set(authHeader())
    .send({
      organizationId,
      feature: buildPolygon([
        [-122.42, 37.78],
        [-122.41, 37.78],
        [-122.41, 37.77],
      ]),
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);

  const zonesResponse = await request(app)
    .get("/zones")
    .query({ organizationId })
    .set(authHeader());

  assert.equal(zonesResponse.status, 200);
  assert.equal(zonesResponse.body.features.length, 1);

  const ring = zonesResponse.body.features[0].geometry.coordinates[0];
  assert.equal(ring.length, 4);
  assert.deepEqual(ring[0], ring[ring.length - 1]);
});

test("POST /zones enforces unique zone name per organization", async () => {
  const organizationId = randomUUID();
  const firstCreate = await request(app)
    .post("/zones")
    .set(authHeader())
    .send({
      organizationId,
      feature: buildPolygonWithName(
        [
          [-122.42, 37.78],
          [-122.41, 37.78],
          [-122.41, 37.77],
        ],
        "North Block",
      ),
    });
  assert.equal(firstCreate.status, 200);

  const duplicateCreate = await request(app)
    .post("/zones")
    .set(authHeader())
    .send({
      organizationId,
      feature: buildPolygonWithName(
        [
          [-122.40, 37.78],
          [-122.39, 37.78],
          [-122.39, 37.77],
        ],
        "north block",
      ),
    });
  assert.equal(duplicateCreate.status, 409);
  assert.equal(duplicateCreate.body.error, "zone_name_taken");
  assert.ok(duplicateCreate.body.existingZoneId);
});

test("PUT /zones/:zoneId updates existing zone by id", async () => {
  const organizationId = randomUUID();
  const createResponse = await request(app)
    .post("/zones")
    .set(authHeader())
    .send({
      organizationId,
      feature: buildPolygonWithName(
        [
          [-122.42, 37.78],
          [-122.41, 37.78],
          [-122.41, 37.77],
        ],
        "Central",
      ),
    });
  assert.equal(createResponse.status, 200);
  const createdId = String(createResponse.body.id);

  const updateResponse = await request(app)
    .put(`/zones/${encodeURIComponent(createdId)}`)
    .set(authHeader())
    .send({
      organizationId,
      feature: buildPolygonWithName(
        [
          [-122.423, 37.782],
          [-122.409, 37.782],
          [-122.409, 37.768],
        ],
        "Central",
      ),
    });

  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.ok, true);
  assert.equal(updateResponse.body.updated, true);
  assert.equal(updateResponse.body.id, createdId);
});

test("PUT /zones/:zoneId rejects duplicate zone names", async () => {
  const organizationId = randomUUID();

  const alphaCreate = await request(app)
    .post("/zones")
    .set(authHeader())
    .send({
      organizationId,
      feature: buildPolygonWithName(
        [
          [-122.42, 37.78],
          [-122.41, 37.78],
          [-122.41, 37.77],
        ],
        "Alpha",
      ),
    });
  assert.equal(alphaCreate.status, 200);

  const betaCreate = await request(app)
    .post("/zones")
    .set(authHeader())
    .send({
      organizationId,
      feature: buildPolygonWithName(
        [
          [-122.40, 37.78],
          [-122.39, 37.78],
          [-122.39, 37.77],
        ],
        "Beta",
      ),
    });
  assert.equal(betaCreate.status, 200);
  const betaZoneId = String(betaCreate.body.id);

  const duplicateUpdate = await request(app)
    .put(`/zones/${encodeURIComponent(betaZoneId)}`)
    .set(authHeader())
    .send({
      organizationId,
      feature: buildPolygonWithName(
        [
          [-122.399, 37.779],
          [-122.389, 37.779],
          [-122.389, 37.769],
        ],
        " alpha ",
      ),
    });

  assert.equal(duplicateUpdate.status, 409);
  assert.equal(duplicateUpdate.body.error, "zone_name_taken");
});

test("POST /zones returns overlap_detected for intersecting polygons", async () => {
  const organizationId = randomUUID();
  await request(app)
    .post("/zones")
    .set(authHeader())
    .send({
      organizationId,
      feature: buildPolygon([
        [-122.42, 37.78],
        [-122.40, 37.78],
        [-122.40, 37.76],
        [-122.42, 37.76],
      ]),
    });

  const overlapResponse = await request(app)
    .post("/zones")
    .set(authHeader())
    .send({
      organizationId,
      feature: buildPolygon([
        [-122.41, 37.77],
        [-122.39, 37.77],
        [-122.39, 37.75],
        [-122.41, 37.75],
      ]),
    });

  assert.equal(overlapResponse.status, 409);
  assert.equal(overlapResponse.body.error, "overlap_detected");
  assert.ok(overlapResponse.body.overlappingZone);
  assert.ok(Array.isArray(overlapResponse.body.overlappingZones));
  assert.ok(overlapResponse.body.newZone);
});

test("POST /zones/adjust returns 404 for missing overlap id", async () => {
  const organizationId = randomUUID();
  const response = await request(app)
    .post("/zones/adjust")
    .set(authHeader())
    .send({
      organizationId,
      overlappingZoneId: "missing-zone-id",
      newZone: buildPolygon([
        [-122.42, 37.78],
        [-122.41, 37.78],
        [-122.41, 37.77],
      ]),
    });

  assert.equal(response.status, 404);
  assert.equal(response.body.error, "Overlapping zone not found");
});

test("POST /zones/adjust returns adjusted zone that can be saved", async () => {
  const organizationId = randomUUID();
  const createBaseResponse = await request(app)
    .post("/zones")
    .set(authHeader())
    .send({
      organizationId,
      feature: buildPolygon([
        [-122.42, 37.78],
        [-122.40, 37.78],
        [-122.40, 37.76],
        [-122.42, 37.76],
      ]),
    });

  assert.equal(createBaseResponse.status, 200);

  const overlapResponse = await request(app)
    .post("/zones")
    .set(authHeader())
    .send({
      organizationId,
      feature: buildPolygon([
        [-122.41, 37.775],
        [-122.39, 37.775],
        [-122.39, 37.755],
        [-122.41, 37.755],
      ]),
    });

  assert.equal(overlapResponse.status, 409);
  const overlapId = String(overlapResponse.body.overlappingZone.id);

  const adjustResponse = await request(app)
    .post("/zones/adjust")
    .set(authHeader())
    .send({
      organizationId,
      overlappingZoneId: overlapId,
      newZone: overlapResponse.body.newZone,
    });

  assert.equal(adjustResponse.status, 200);
  assert.equal(adjustResponse.body.ok, true);
  assert.ok(adjustResponse.body.adjustedZone);

  const saveAdjustedResponse = await request(app)
    .post("/zones")
    .set(authHeader())
    .send({
      organizationId,
      feature: adjustResponse.body.adjustedZone,
    });
  assert.equal(saveAdjustedResponse.status, 200);
  assert.equal(saveAdjustedResponse.body.ok, true);
});

test("POST /zones allows boundary-sharing without overlap", async () => {
  const organizationId = randomUUID();

  const baseResponse = await request(app)
    .post("/zones")
    .set(authHeader())
    .send({
      organizationId,
      feature: buildPolygon([
        [-122.42, 37.78],
        [-122.41, 37.78],
        [-122.41, 37.76],
        [-122.42, 37.76],
      ]),
    });
  assert.equal(baseResponse.status, 200);

  const touchingResponse = await request(app)
    .post("/zones")
    .set(authHeader())
    .send({
      organizationId,
      feature: buildPolygon([
        [-122.41, 37.78],
        [-122.40, 37.78],
        [-122.40, 37.76],
        [-122.41, 37.76],
      ]),
    });

  assert.equal(touchingResponse.status, 200);
  assert.equal(touchingResponse.body.ok, true);
});

test("POST /zones/adjust preserves hole geometry when wrapping around inner zone", async () => {
  const organizationId = randomUUID();

  const createInner = await request(app)
    .post("/zones")
    .set(authHeader())
    .send({
      organizationId,
      feature: buildPolygon([
        [-122.413, 37.773],
        [-122.407, 37.773],
        [-122.407, 37.767],
        [-122.413, 37.767],
      ]),
    });
  assert.equal(createInner.status, 200);

  const overlapResponse = await request(app)
    .post("/zones")
    .set(authHeader())
    .send({
      organizationId,
      feature: buildPolygon([
        [-122.42, 37.78],
        [-122.40, 37.78],
        [-122.40, 37.76],
        [-122.42, 37.76],
      ]),
    });
  assert.equal(overlapResponse.status, 409);

  const adjustResponse = await request(app)
    .post("/zones/adjust")
    .set(authHeader())
    .send({
      organizationId,
      overlappingZoneId: String(overlapResponse.body.overlappingZone.id),
      newZone: overlapResponse.body.newZone,
    });
  assert.equal(adjustResponse.status, 200);
  assert.equal(adjustResponse.body.adjustedZone.geometry.type, "Polygon");
  assert.ok(adjustResponse.body.adjustedZone.geometry.coordinates.length > 1);

  const saveAdjustedResponse = await request(app)
    .post("/zones")
    .set(authHeader())
    .send({
      organizationId,
      feature: adjustResponse.body.adjustedZone,
    });
  assert.equal(saveAdjustedResponse.status, 200);
});

test("POST /zones/adjust returns multipolygon when overlap splits draft zone", async () => {
  const organizationId = randomUUID();

  const createSplitter = await request(app)
    .post("/zones")
    .set(authHeader())
    .send({
      organizationId,
      feature: buildPolygon([
        [-122.411, 37.79],
        [-122.409, 37.79],
        [-122.409, 37.75],
        [-122.411, 37.75],
      ]),
    });
  assert.equal(createSplitter.status, 200);

  const overlapResponse = await request(app)
    .post("/zones")
    .set(authHeader())
    .send({
      organizationId,
      feature: buildPolygon([
        [-122.42, 37.78],
        [-122.40, 37.78],
        [-122.40, 37.76],
        [-122.42, 37.76],
      ]),
    });
  assert.equal(overlapResponse.status, 409);

  const adjustResponse = await request(app)
    .post("/zones/adjust")
    .set(authHeader())
    .send({
      organizationId,
      overlappingZoneId: String(overlapResponse.body.overlappingZone.id),
      newZone: overlapResponse.body.newZone,
    });
  assert.equal(adjustResponse.status, 200);
  assert.equal(adjustResponse.body.adjustedZone.geometry.type, "MultiPolygon");
  assert.ok(adjustResponse.body.adjustedZone.geometry.coordinates.length >= 2);

  const saveAdjustedResponse = await request(app)
    .post("/zones")
    .set(authHeader())
    .send({
      organizationId,
      feature: adjustResponse.body.adjustedZone,
    });
  assert.equal(saveAdjustedResponse.status, 200);
});

test("POST /zones/adjust handles multiple overlapping zones in one call", async () => {
  const organizationId = randomUUID();

  const leftBase = await request(app)
    .post("/zones")
    .set(authHeader())
    .send({
      organizationId,
      feature: buildPolygon([
        [-122.42, 37.78],
        [-122.415, 37.78],
        [-122.415, 37.76],
        [-122.42, 37.76],
      ]),
    });
  assert.equal(leftBase.status, 200);

  const rightBase = await request(app)
    .post("/zones")
    .set(authHeader())
    .send({
      organizationId,
      feature: buildPolygon([
        [-122.405, 37.78],
        [-122.40, 37.78],
        [-122.40, 37.76],
        [-122.405, 37.76],
      ]),
    });
  assert.equal(rightBase.status, 200);

  const overlapResponse = await request(app)
    .post("/zones")
    .set(authHeader())
    .send({
      organizationId,
      feature: buildPolygon([
        [-122.421, 37.781],
        [-122.399, 37.781],
        [-122.399, 37.759],
        [-122.421, 37.759],
      ]),
    });
  assert.equal(overlapResponse.status, 409);
  assert.ok(Array.isArray(overlapResponse.body.overlappingZones));
  assert.ok(overlapResponse.body.overlappingZones.length >= 2);

  const overlapIds = overlapResponse.body.overlappingZones.map((zone: { id: string }) => String(zone.id));
  const adjustResponse = await request(app)
    .post("/zones/adjust")
    .set(authHeader())
    .send({
      organizationId,
      overlappingZoneIds: overlapIds,
      newZone: overlapResponse.body.newZone,
    });
  assert.equal(adjustResponse.status, 200);

  const saveAdjustedResponse = await request(app)
    .post("/zones")
    .set(authHeader())
    .send({
      organizationId,
      feature: adjustResponse.body.adjustedZone,
    });
  assert.equal(saveAdjustedResponse.status, 200);
});

test("DELETE /zones/:zoneId removes zone by organization", async () => {
  const organizationId = randomUUID();

  const createResponse = await request(app)
    .post("/zones")
    .set(authHeader())
    .send({
      organizationId,
      feature: buildPolygon([
        [-122.42, 37.78],
        [-122.41, 37.78],
        [-122.41, 37.77],
      ]),
    });
  assert.equal(createResponse.status, 200);
  const createdId = String(createResponse.body.id);

  const deleteResponse = await request(app)
    .delete(`/zones/${encodeURIComponent(createdId)}`)
    .query({ organizationId })
    .set(authHeader());
  assert.equal(deleteResponse.status, 200);
  assert.equal(deleteResponse.body.ok, true);
  assert.equal(deleteResponse.body.deletedId, createdId);

  const zonesAfterDelete = await request(app)
    .get("/zones")
    .query({ organizationId })
    .set(authHeader());
  assert.equal(zonesAfterDelete.status, 200);
  assert.equal(zonesAfterDelete.body.features.length, 0);
});

test("POST /h3/generate validates resolution and returns feature collection", async () => {
  const invalidResponse = await request(app)
    .post("/h3/generate")
    .set(authHeader())
    .send({
      polygon: [
        [-122.42, 37.78],
        [-122.41, 37.78],
        [-122.41, 37.77],
      ],
      resolution: 16,
    });
  assert.equal(invalidResponse.status, 400);

  const validResponse = await request(app)
    .post("/h3/generate")
    .set(authHeader())
    .send({
      polygon: [
        [-122.42, 37.78],
        [-122.41, 37.78],
        [-122.41, 37.77],
      ],
      resolution: 9,
    });
  assert.equal(validResponse.status, 200);
  assert.equal(validResponse.body.type, "FeatureCollection");
  assert.ok(Array.isArray(validResponse.body.features));
});
