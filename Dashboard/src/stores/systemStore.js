import { create } from 'zustand';
import { systemService } from '@/services/systemService';
export const useSystemStore=create((set,get)=>({
 settings:{currency:'VND',currencyFormat:'vi-VN',primaryColor:'#465fff'},isLoading:false,
 fetchSettings:async()=>{set({isLoading:true});try{set({settings:await systemService.getSettings()});}finally{set({isLoading:false});}},
 updateSettings:async updates=>{const saved=await systemService.updateSettings({...get().settings,...updates});set({settings:saved});},
 formatCurrency:amount=>new Intl.NumberFormat(get().settings.currencyFormat||'vi-VN',{style:'currency',currency:get().settings.currency||'VND',maximumFractionDigits:0}).format(amount),
}));

