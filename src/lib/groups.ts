// Gestion des groupes GM via localStorage
// Les données sont stockées localement et partagées entre les composants

const STORAGE_KEY = "gm_groups";

export type GroupMember = {
  id: string;
  name: string;
};

export type GroupsData = Record<string, GroupMember[]>;

const DEFAULT_GROUPS: GroupsData = {
  "LE CERCLE - ORGA & MC": [],
  "GNB - GANG & PF": [],
};

// Migration des anciens noms de groupes vers les nouveaux
const MIGRATIONS: Record<string, string> = {
  "LE CERCLE": "LE CERCLE - ORGA & MC",
  "GNB": "GNB - GANG & PF",
};

export function getGroups(): GroupsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_GROUPS));
      return DEFAULT_GROUPS;
    }
    let groups: GroupsData = JSON.parse(raw);
    let changed = false;

    // Migrer les anciens noms de groupes
    for (const [oldName, newName] of Object.entries(MIGRATIONS)) {
      if (groups[oldName] && !groups[newName]) {
        groups[newName] = groups[oldName];
        delete groups[oldName];
        changed = true;
      }
    }

    // S'assurer que tous les groupes par défaut existent
    for (const key of Object.keys(DEFAULT_GROUPS)) {
      if (!groups[key]) {
        groups[key] = [];
        changed = true;
      }
    }

    if (changed) {
      saveGroups(groups);
    }

    return groups;
  } catch {
    return DEFAULT_GROUPS;
  }
}

export function saveGroups(groups: GroupsData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
}

export function addMemberToGroup(groupName: string, member: GroupMember): GroupsData {
  const groups = getGroups();
  if (!groups[groupName]) {
    groups[groupName] = [];
  }
  // Pas de doublon
  if (!groups[groupName].some((m) => m.id === member.id)) {
    groups[groupName].push(member);
  }
  saveGroups(groups);
  return groups;
}

export function removeMemberFromGroup(groupName: string, userId: string): GroupsData {
  const groups = getGroups();
  if (groups[groupName]) {
    groups[groupName] = groups[groupName].filter((m) => m.id !== userId);
  }
  saveGroups(groups);
  return groups;
}

// Format simplifié pour sidebar/GM page: { groupName: [username1, username2] }
export function getGroupsSimple(): Record<string, string[]> {
  const groups = getGroups();
  const result: Record<string, string[]> = {};
  for (const [name, members] of Object.entries(groups)) {
    result[name] = members.map((m) => m.name);
  }
  return result;
}
