// Gestion des groupes GM via fonctions RPC Supabase (SECURITY DEFINER)
// Les RPC contournent le cache PostgREST pour l'accès aux données
import { supabase } from "@/integrations/supabase/client";

export type GroupMember = {
  id: string;
  name: string;
};

export type GroupsData = Record<string, GroupMember[]>;

export const GROUP_NAMES = ["LE CERCLE - ORGA & MC", "GNB - GANG & PF"] as const;
export type GroupName = (typeof GROUP_NAMES)[number];

// Récupérer tous les groupes via RPC get_gm_groups
export async function fetchGroups(): Promise<GroupsData> {
  const result: GroupsData = {};
  for (const name of GROUP_NAMES) {
    result[name] = [];
  }

  const { data, error } = await supabase.rpc("get_gm_groups");

  if (error) {
    console.warn("Erreur chargement groupes:", error.message);
    return result;
  }

  for (const row of data ?? []) {
    const groupName = row.gm_group;
    if (!result[groupName]) {
      result[groupName] = [];
    }
    result[groupName].push({ id: row.user_id, name: row.username });
  }

  return result;
}

// Ajouter un utilisateur à un groupe via RPC set_gm_group
export async function addMemberToGroup(groupName: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc("set_gm_group", {
    p_user_id: userId,
    p_group_name: groupName,
  });
  if (error) throw new Error(error.message);
}

// Retirer un utilisateur d'un groupe via RPC set_gm_group(null)
export async function removeMemberFromGroup(userId: string): Promise<void> {
  const { error } = await supabase.rpc("set_gm_group", {
    p_user_id: userId,
    p_group_name: null,
  });
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
