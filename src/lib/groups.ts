// Gestion des groupes GM via Supabase (partagé entre tous les utilisateurs)
import { supabase } from "@/integrations/supabase/client";

export type GroupMember = {
  id: string;
  name: string;
};

export type GroupsData = Record<string, GroupMember[]>;

export const GROUP_NAMES = ["LE CERCLE - ORGA & MC", "GNB - GANG & PF"] as const;

// Récupérer tous les groupes depuis Supabase
export async function fetchGroups(): Promise<GroupsData> {
  const result: GroupsData = {};
  for (const name of GROUP_NAMES) {
    result[name] = [];
  }

  try {
    const { data, error } = await supabase.rpc("get_gm_groups" as any);
    if (error) {
      console.warn("Erreur chargement groupes:", error.message);
      return result;
    }

    if (Array.isArray(data)) {
      for (const row of data as { user_id: string; username: string; group_name: string }[]) {
        const groupName = row.group_name;
        if (!result[groupName]) {
          result[groupName] = [];
        }
        result[groupName].push({ id: row.user_id, name: row.username });
      }
    }
  } catch {
    // Fallback silencieux
  }

  return result;
}

// Ajouter un utilisateur à un groupe via Supabase
export async function addMemberToGroup(groupName: string, member: GroupMember): Promise<void> {
  const { error } = await supabase.rpc("add_user_to_group_fn" as any, {
    p_user_id: member.id,
    p_group_name: groupName,
  });
  if (error) {
    throw new Error(error.message);
  }
}

// Retirer un utilisateur d'un groupe via Supabase
export async function removeMemberFromGroup(groupName: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc("remove_user_from_group_fn" as any, {
    p_user_id: userId,
    p_group_name: groupName,
  });
  if (error) {
    throw new Error(error.message);
  }
}

// Format simplifié pour sidebar/GM page: { groupName: [username1, username2] }
export async function fetchGroupsSimple(): Promise<Record<string, string[]>> {
  const groups = await fetchGroups();
  const result: Record<string, string[]> = {};
  for (const [name, members] of Object.entries(groups)) {
    result[name] = members.map((m) => m.name);
  }
  return result;
}
