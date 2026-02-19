// Gestion des groupes GM via Supabase
// Les données sont stockées en base et partagées entre tous les utilisateurs

import { supabase } from "@/integrations/supabase/client";

export type GroupMember = {
  id: string;
  name: string;
};

export type GroupsData = Record<string, GroupMember[]>;

const DEFAULT_GROUP_NAMES = [
  "LE CERCLE - ORGA & MC",
  "GNB - GANG & PF",
];

export async function getGroupsFromSupabase(): Promise<GroupsData> {
  const { data, error } = await supabase
    .from("group_members")
    .select("group_name, user_id, username")
    .order("created_at", { ascending: true });

  const groups: GroupsData = {};
  for (const name of DEFAULT_GROUP_NAMES) {
    groups[name] = [];
  }

  if (error) {
    console.error("Erreur chargement groupes:", error);
    return groups;
  }

  for (const row of data) {
    if (!groups[row.group_name]) {
      groups[row.group_name] = [];
    }
    groups[row.group_name].push({ id: row.user_id, name: row.username });
  }

  return groups;
}

export async function addMemberToGroupSupabase(groupName: string, member: GroupMember): Promise<void> {
  const { error } = await supabase
    .from("group_members")
    .insert({ group_name: groupName, user_id: member.id, username: member.name });
  if (error) throw error;
}

export async function removeMemberFromGroupSupabase(groupName: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_name", groupName)
    .eq("user_id", userId);
  if (error) throw error;
}

// Format simplifié pour sidebar/GM page: { groupName: [username1, username2] }
export async function getGroupsSimpleFromSupabase(): Promise<Record<string, string[]>> {
  const groups = await getGroupsFromSupabase();
  const result: Record<string, string[]> = {};
  for (const [name, members] of Object.entries(groups)) {
    result[name] = members.map((m) => m.name);
  }
  return result;
}

// Fonctions legacy synchrones conservées pour compatibilité temporaire
const STORAGE_KEY = "gm_groups";

export function getGroups(): GroupsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return Object.fromEntries(DEFAULT_GROUP_NAMES.map((n) => [n, []]));
    return JSON.parse(raw);
  } catch {
    return Object.fromEntries(DEFAULT_GROUP_NAMES.map((n) => [n, []]));
  }
}

export function getGroupsSimple(): Record<string, string[]> {
  const groups = getGroups();
  const result: Record<string, string[]> = {};
  for (const [name, members] of Object.entries(groups)) {
    result[name] = members.map((m) => m.name);
  }
  return result;
}
