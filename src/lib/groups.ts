// Gestion des groupes GM via Supabase (partagé entre tous les utilisateurs)
import { supabase } from "@/integrations/supabase/client";

export type GroupMember = {
  id: string;
  name: string;
};

export type GroupsData = Record<string, GroupMember[]>;

export const GROUP_NAMES = ["LE CERCLE - ORGA & MC", "GNB - GANG & PF"] as const;

// Récupérer tous les groupes depuis Supabase (accès direct à la table)
export async function fetchGroups(): Promise<GroupsData> {
  const result: GroupsData = {};
  for (const name of GROUP_NAMES) {
    result[name] = [];
  }

  try {
    // Récupérer les entrées de user_groups
    const { data: groupRows, error: groupError } = await (supabase as any)
      .from("user_groups")
      .select("user_id, group_name");

    if (groupError) {
      console.warn("Erreur chargement groupes:", groupError.message);
      return result;
    }

    if (!groupRows || groupRows.length === 0) return result;

    // Récupérer les profils pour avoir les noms
    const userIds = [...new Set(groupRows.map((r: any) => r.user_id))] as string[];
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, username")
      .in("user_id", userIds);

    if (profileError) {
      console.warn("Erreur chargement profils:", profileError.message);
      return result;
    }

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p.username]) ?? []);

    for (const row of groupRows as { user_id: string; group_name: string }[]) {
      const groupName = row.group_name;
      if (!result[groupName]) {
        result[groupName] = [];
      }
      result[groupName].push({
        id: row.user_id,
        name: profileMap.get(row.user_id) ?? "Inconnu",
      });
    }
  } catch {
    // Fallback silencieux
  }

  return result;
}

// Ajouter un utilisateur à un groupe via Supabase
export async function addMemberToGroup(groupName: string, member: GroupMember): Promise<void> {
  const { error } = await (supabase as any)
    .from("user_groups")
    .insert({ user_id: member.id, group_name: groupName });
  if (error) {
    if (error.message?.includes("duplicate") || error.code === "23505") {
      return; // Déjà dans le groupe, pas d'erreur
    }
    throw new Error(error.message);
  }
}

// Retirer un utilisateur d'un groupe via Supabase
export async function removeMemberFromGroup(groupName: string, userId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("user_groups")
    .delete()
    .eq("user_id", userId)
    .eq("group_name", groupName);
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
