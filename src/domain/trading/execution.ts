import "server-only";
import type { OpenTrade } from "./simulation";
import type { Quote } from "./market-data";
import type { Json } from "@/types/database.types";
export interface ExecutionStore { rpc(name:string,args:Record<string,Json|undefined>):Promise<Json> }
export interface OpenExecution { readonly userId:string; readonly request:OpenTrade; readonly quote:Quote }
export interface CloseExecution { readonly userId:string; readonly positionId:string; readonly key:string; readonly reason:"MANUAL"|"STOP_LOSS"|"TAKE_PROFIT"; readonly quote:Quote }
export interface ExecutionProvider { readonly environment:"SIMULATED"|"LIVE"; open(command:OpenExecution):Promise<Json>; close(command:CloseExecution):Promise<Json> }
export interface LiveBrokerExecutionProvider extends ExecutionProvider { readonly environment:"LIVE" }
export class SimulationExecutionProvider implements ExecutionProvider {
 readonly environment="SIMULATED" as const;
 constructor(private store:ExecutionStore) {}
 open({userId,request:r,quote}:OpenExecution) {return this.store.rpc("open_simulation_position",{p_user:userId,p_instrument:r.instrument,p_side:r.side,p_amount:r.amount,p_sl:r.stopLoss,p_tp:r.takeProfit,p_key:r.idempotencyKey,p_quote:quote as unknown as Json});}
 close({userId,positionId,key,reason,quote}:CloseExecution) {return this.store.rpc("close_simulation_position",{p_user:userId,p_position:positionId,p_key:key,p_reason:reason,p_quote:quote as unknown as Json});}
}
export class ExecutionRouter {
 constructor(private simulation:SimulationExecutionProvider) {}
 open(command:OpenExecution,environment="SIMULATED") {if(environment!=="SIMULATED")throw new Error("Unsupported execution environment");return this.simulation.open(command);}
 close(command:CloseExecution,environment="SIMULATED") {if(environment!=="SIMULATED")throw new Error("Unsupported execution environment");return this.simulation.close(command);}
}
