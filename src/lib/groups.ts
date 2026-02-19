// Gestion des groupes GM via la colonne gm_group de profiles (Supabase)
// Utilise la table profiles qui est déjà reconnue par le cache PostgREST
import { supabase } from "@/integrations/supabase/client";

export type GroupMember = {
  id: string;
  name: string;
};

export type GroupsData = Record<string, GroupMember[]>;

export const GROUP_NAMES = ["LE CERCLE - ORGA & MC", "GNB - GANG & PF"] as const;
export type GroupName = (typeof GROUP_NAMES)[number];

// Récupérer tous les groupes depuis profiles.gm_group
export async function fetchGroups(): Promise<GroupsData> {
  const result: GroupsData = {};
  for (const name of GROUP_NAMES) {
    result[name] = [];
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, username, gm_group")
    .not("gm_group", "is", null);

  if (error) {
    console.warn("Erreur chargement groupes:", error.message);
    return result;
  }

  for (const profile of data ?? []) {
    const groupName = profile.gm_group as string;
    if (!result[groupName]) {
      result[groupName] = [];
    }
    result[groupName].push({ id: profile.user_id, name: profile.username });
  }

  return result;
}

// Ajouter un utilisateur à un groupe (update profiles.gm_group)
export async function addMemberToGroup(groupName: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ gm_group: groupName })
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

// Retirer un utilisateur d'un groupe (set gm_group = null)
export async function removeMemberFromGroup(userId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ gm_group: null })
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

// Format simplifié : { groupName: [username1, username2] }
export async function fetchGroupsSimple(): Promise<Record<string, string[]>> {
  const groups = await fetchGroups();
  const result: Record<string, string[]> = {};
  for (const [name, members] of Object.entries(groups)) {
    result[name] = members.map((m) => m.name);
  }
  return result;
}
