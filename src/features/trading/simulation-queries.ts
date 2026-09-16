"use client";
import { useQuery,useMutation,useQueryClient } from "@tanstack/react-query";
import type { simulationSnapshot } from "@/services/trading/simulation-service";
import { useAuth } from "@/providers/auth-provider";
export type SimulationData=Awaited<ReturnType<typeof simulationSnapshot>>;
export async function simulationFetch<T>(url:string,body?:unknown,key?:string):Promise<T> {
 const response=await fetch(url,body===undefined ? undefined : {method:"POST",headers:{"Content-Type":"application/json",...(key ? {"Idempotency-Key":key} : {})},body:JSON.stringify(body)});
 const data=await response.json();
 if(!response.ok) throw new Error(typeof data.error==="string" ? data.error : "Simulation unavailable");
 return data;
}
export function useSimulation() {
 const {user}=useAuth();
 return useQuery({queryKey:["trading","simulation",user?.id],queryFn:()=>simulationFetch<SimulationData>("/api/trading/simulation"),refetchInterval:30_000,refetchIntervalInBackground:false,retry:false,gcTime:0});
}
export function useSimulationAction(path:string) {
 const client=useQueryClient();
 return useMutation({mutationFn:(body:unknown)=>simulationFetch(`/api/trading/simulation${path}`,body),onSuccess:async()=>{ await client.invalidateQueries({queryKey:["trading","simulation"]}); }});
}

export function useVirtualOpen() {
 const client=useQueryClient();
 return useMutation({mutationFn:({body,key}:{body:import("@/domain/trading/simulation").VirtualOpen;key:string})=>simulationFetch("/api/trading/simulation/open",body,key),onSuccess:async()=>{await client.invalidateQueries({queryKey:["trading","virtual-account"]});}});
}
export function useVirtualAccount() {
 const {user}=useAuth();
 return useQuery({queryKey:["trading","virtual-account",user?.id],enabled:!!user,retry:false,gcTime:0,queryFn:()=>simulationFetch<{account:import("@/services/trading/virtual-account").VirtualAccount}>("/api/trading/virtual-account")});
}
