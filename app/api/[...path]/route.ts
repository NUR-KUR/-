import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {handleAPI} from '../../../lib/api';
async function route(request:Request){return handleAPI(request,env.DB,await getChatGPTUser());}
export const GET=route;export const POST=route;export const PATCH=route;export const DELETE=route;
