/**
 * Voice Influence case-set drafts (`voice_influence_case_set_drafts`).
 * Researcher authoring only — never writes harness run documents.
 */

import "server-only";
import { ObjectId, type WithId, type Document } from "mongodb";
import {
  ensureMongoIndexes,
  getVoiceInfluenceDraftsCollection,
} from "@/server/config/mongodb";
import {
  emptyVoiceInfluenceConditions,
  parseVoiceInfluenceDraftInput,
  VOICE_INFLUENCE_STUDY_TYPE,
  type VoiceInfluenceCaseSetDraft,
  type VoiceInfluenceDraftInput,
  type VoiceInfluenceDraftSummary,
} from "@/lib/voice-influence-case-set";

function docToDraft(doc: WithId<Document> | null | undefined): VoiceInfluenceCaseSetDraft | null {
  if (!doc) return null;
  const parsed = parseVoiceInfluenceDraftInput(doc);
  if (!parsed.ok) return null;
  const createdAt =
    typeof doc.createdAt === "string"
      ? doc.createdAt
      : doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : new Date(0).toISOString();
  const updatedAt =
    typeof doc.updatedAt === "string"
      ? doc.updatedAt
      : doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : createdAt;
  return {
    id: String(doc._id),
    userId: typeof doc.user_id === "string" ? doc.user_id : "",
    studyType: VOICE_INFLUENCE_STUDY_TYPE,
    createdAt,
    updatedAt,
    ...parsed.data,
  };
}

function docToSummary(doc: WithId<Document>): VoiceInfluenceDraftSummary {
  return {
    id: String(doc._id),
    name: typeof doc.name === "string" ? doc.name : "",
    decision: typeof doc.decision === "string" ? doc.decision : "",
    domain: typeof doc.domain === "string" ? doc.domain : "",
    updatedAt:
      typeof doc.updatedAt === "string"
        ? doc.updatedAt
        : doc.updatedAt instanceof Date
          ? doc.updatedAt.toISOString()
          : "",
  };
}

export async function listVoiceInfluenceDraftsForUser(
  userId: string
): Promise<VoiceInfluenceDraftSummary[]> {
  await ensureMongoIndexes();
  const col = await getVoiceInfluenceDraftsCollection();
  const docs = await col
    .find({ user_id: userId, study_type: VOICE_INFLUENCE_STUDY_TYPE })
    .project({ name: 1, decision: 1, domain: 1, updatedAt: 1 })
    .sort({ updatedAt: -1 })
    .limit(100)
    .toArray();
  return docs.map((doc) => docToSummary(doc as WithId<Document>));
}

export async function getVoiceInfluenceDraftForUser(
  userId: string,
  draftId: string
): Promise<VoiceInfluenceCaseSetDraft | null> {
  if (!ObjectId.isValid(draftId)) return null;
  await ensureMongoIndexes();
  const col = await getVoiceInfluenceDraftsCollection();
  const doc = await col.findOne({
    _id: new ObjectId(draftId),
    user_id: userId,
    study_type: VOICE_INFLUENCE_STUDY_TYPE,
  });
  return docToDraft(doc as WithId<Document> | null);
}

export async function createVoiceInfluenceDraft(
  userId: string,
  input?: Partial<VoiceInfluenceDraftInput>
): Promise<VoiceInfluenceCaseSetDraft> {
  await ensureMongoIndexes();
  const now = new Date().toISOString();
  const conditions = input?.conditions?.length
    ? input.conditions
    : emptyVoiceInfluenceConditions();
  const parsed = parseVoiceInfluenceDraftInput({
    name: input?.name ?? "",
    decision: input?.decision ?? "",
    domain: input?.domain ?? "",
    conditions,
  });
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  const col = await getVoiceInfluenceDraftsCollection();
  const result = await col.insertOne({
    user_id: userId,
    study_type: VOICE_INFLUENCE_STUDY_TYPE,
    name: parsed.data.name,
    decision: parsed.data.decision,
    domain: parsed.data.domain,
    conditions: parsed.data.conditions,
    createdAt: now,
    updatedAt: now,
  });
  const created = await getVoiceInfluenceDraftForUser(userId, String(result.insertedId));
  if (!created) {
    throw new Error("Failed to reload Voice Influence draft after insert");
  }
  return created;
}

export async function updateVoiceInfluenceDraftForUser(
  userId: string,
  draftId: string,
  input: VoiceInfluenceDraftInput
): Promise<VoiceInfluenceCaseSetDraft | null> {
  if (!ObjectId.isValid(draftId)) return null;
  const parsed = parseVoiceInfluenceDraftInput(input);
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  await ensureMongoIndexes();
  const col = await getVoiceInfluenceDraftsCollection();
  const now = new Date().toISOString();
  const result = await col.findOneAndUpdate(
    {
      _id: new ObjectId(draftId),
      user_id: userId,
      study_type: VOICE_INFLUENCE_STUDY_TYPE,
    },
    {
      $set: {
        name: parsed.data.name,
        decision: parsed.data.decision,
        domain: parsed.data.domain,
        conditions: parsed.data.conditions,
        study_type: VOICE_INFLUENCE_STUDY_TYPE,
        updatedAt: now,
      },
    },
    { returnDocument: "after" }
  );
  return docToDraft(result as WithId<Document> | null);
}
