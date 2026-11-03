/** Listas do jogo (espelham public/game) usadas no painel de administração. */
export const LEVEL_CAP = 50;

export const RESOURCES: { id: string; name: string }[] = [
  { id: "wood", name: "Madeira" }, { id: "stone", name: "Pedra" }, { id: "iron", name: "Ferro" },
  { id: "berry", name: "Frutas" }, { id: "goldOre", name: "Ouro (minério)" }, { id: "diamond", name: "Diamante" },
  { id: "fish", name: "Peixe" }, { id: "wheat", name: "Trigo" }, { id: "cactus", name: "Cacto" },
  { id: "sand", name: "Arenito" }, { id: "pine", name: "Pinho" }, { id: "ice", name: "Gelo" },
  { id: "mushroom", name: "Cogumelo" }, { id: "herb", name: "Erva" }, { id: "obsidian", name: "Obsidiana" },
  { id: "ember", name: "Brasa" }, { id: "meat", name: "Carne" }, { id: "leather", name: "Couro" },
  { id: "fang", name: "Presa" },
];

export const TOOLS = [
  { id: "axe", name: "Machado de Madeira" }, { id: "pickaxe", name: "Picareta de Pedra" },
  { id: "hoe", name: "Enxada" }, { id: "rod", name: "Vara de Pesca" },
  { id: "sword_diamond", name: "Espada de Diamante" },
];

export const BUILDS = [
  { id: "wall_wood", name: "Parede de Madeira" }, { id: "wall_stone", name: "Parede de Pedra" },
  { id: "fence_wood", name: "Cerca" }, { id: "campfire", name: "Fogueira" }, { id: "chest", name: "Baú" },
];

export const GEAR_SLOTS = [
  { id: "weapon", name: "Arma" }, { id: "helmet", name: "Capacete" }, { id: "armor", name: "Armadura" },
  { id: "boots", name: "Botas" }, { id: "ring", name: "Anel" }, { id: "accessory", name: "Acessório" },
];

export const RARITIES = ["Comum", "Incomum", "Raro", "Épico", "Lendário"];

export const PETS = [
  { id: "slime", name: "Slime" }, { id: "fox", name: "Raposa Mística" }, { id: "wisp", name: "Fagulha Arcana" },
  { id: "lume", name: "Vagalume de Lúmen" }, { id: "crystal", name: "Raposa Cristalina" },
  { id: "root", name: "Filhote das Raízes" }, { id: "drake", name: "Draco Jovem" },
];

export const MOUNTS = [
  { id: "horse", name: "Corcel Pardo" }, { id: "wolf", name: "Lobo Sombrio" }, { id: "griffin", name: "Grifo Dourado" },
  { id: "unicorn", name: "Unicórnio Celestial" }, { id: "dragon", name: "Dragão Ancestral" },
];
