import type { Request, Response} from "express";

function test(req: Request, res: Response) {
   res.status(200).json({"Success": "Path Worked"}); 
}


export { test };