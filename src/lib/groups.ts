// Gestion des groupes GM via la colonne gm_group de la table profiles
// Les données sont partagées entre tous les utilisateurs

import { supabase } from "@/integrations/supabase/client";

export type GroupMember = {
  id: string;
  name: string;
};

export type GroupsData = Record<string, GroupMember[]>;

export const GROUP_NAMES = [
  "LE CERCLE - ORGA & MC",
  "GNB - GANG & PF",
];

// Récupérer les groupes avec id + nom (pour Administration)
export async function getGroupsFromSupabase(): Promise<GroupsData> {
  const groups: GroupsData = {};
  for (const name of GROUP_NAMES) {
    groups[name] = [];
  }

  const { data, error } = await supabase.rpc("get_gm_groups");

  if (error) {
    console.error("Erreur chargement groupes:", error);
    return groups;
  }

  for (const row of data ?? []) {
    if (row.gm_group && groups[row.gm_group]) {
      groups[row.gm_group].push({ id: row.user_id, name: row.username });
    }
  }

  return groups;
}

// Ajouter un membre à un groupe
export async function addMemberToGroupSupabase(groupName: string, member: GroupMember): Promise<void> {
  const { error } = await supabase.rpc("set_gm_group", {
    p_user_id: member.id,
    p_group_name: groupName,
  });
  if (error) throw error;
}

// Retirer un membre d'un groupe (met gm_group à null)
export async function removeMemberFromGroupSupabase(groupName: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc("set_gm_group", {
    p_user_id: userId,
    p_group_name: null,
  });
  if (error) throw error;
}

// Format simplifié pour la page GM : { groupName: [username1, username2] }
export async function getGroupsSimpleFromSupabase(): Promise<Record<string, string[]>> {
  const groups = await getGroupsFromSupabase();
  const result: Record<string, string[]> = {};
  for (const [name, members] of Object.entries(groups)) {
    result[name] = members.map((m) => m.name);
  }
  return result;
}
