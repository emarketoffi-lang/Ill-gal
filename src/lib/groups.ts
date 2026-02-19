// Gestion des groupes GM via Supabase RPC
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
  const { data, error } = await supabase.rpc("get_group_members");

  const groups: GroupsData = {};
  for (const name of DEFAULT_GROUP_NAMES) {
    groups[name] = [];
  }

  if (error) {
    console.error("Erreur chargement groupes:", error);
    return groups;
  }

  for (const row of (data ?? [])) {
    if (!groups[row.group_name]) {
      groups[row.group_name] = [];
    }
    groups[row.group_name].push({ id: row.user_id, name: row.username });
  }

  return groups;
}

export async function addMemberToGroupSupabase(groupName: string, member: GroupMember): Promise<void> {
  const { error } = await supabase.rpc("add_group_member", {
    p_group_name: groupName,
    p_user_id: member.id,
    p_username: member.name,
  });
  if (error) throw error;
}

export async function removeMemberFromGroupSupabase(groupName: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc("remove_group_member", {
    p_group_name: groupName,
    p_user_id: userId,
  });
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
