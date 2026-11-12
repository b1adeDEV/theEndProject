import type {InventoryItem} from '../types/inventory';
export const items:InventoryItem[]=[
{id:'ak',templateId:'ak',name:'AK-47',type:'weapon',rarity:'rare',width:2,height:1,quantity:1,maxStack:1,icon:'🔫',description:'Автоматическая винтовка',weight:3.8},
{id:'ammo',templateId:'ammo',name:'5.56 Ammo',type:'ammo',rarity:'common',width:1,height:1,quantity:60,maxStack:120,icon:'📦',description:'Патроны для оружия',weight:.2},
{id:'med',templateId:'med',name:'Medkit',type:'medical',rarity:'uncommon',width:1,height:2,quantity:3,maxStack:10,icon:'🩹',description:'Медицинский набор',weight:1.2},
{id:'food',templateId:'food',name:'Ration',type:'food',rarity:'common',width:1,height:1,quantity:5,maxStack:20,icon:'🥫',description:'Полевой рацион',weight:.5},
{id:'armor',templateId:'armor',name:'Armor Plate',type:'armor',rarity:'epic',width:2,height:2,quantity:1,maxStack:1,icon:'🛡️',description:'Защитная пластина',weight:6},
{id:'wood',templateId:'wood',name:'Wood',type:'resource',rarity:'common',width:1,height:1,quantity:240,maxStack:500,icon:'🪵',description:'Строительный ресурс',weight:.1},
{id:'tool',templateId:'tool',name:'Toolbox',type:'misc',rarity:'rare',width:2,height:1,quantity:1,maxStack:1,icon:'🧰',description:'Набор инструментов',weight:2.5}
];
