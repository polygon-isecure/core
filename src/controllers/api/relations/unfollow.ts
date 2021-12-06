import pg from "db/pg";
import type { Request, Response } from "express";

const unfollow = async (req: Request, res: Response) => {
  // Other user's ID
  const { id } = req.params;

  try {
    if (id === (req?.user as any)?.id!!) return res.sendStatus(406);

    // Deleting the relation
    await pg.query(
      `
        DELETE FROM 
          relations 
        
        WHERE 
            to_user = $1 
            AND 
            from_user = $2 
            AND
            status = 'FOLLOWING'
        `,
      [id, (req?.user as any).id]
    );

    return res.json(null);
  } catch (error: any) {
    if (error?.code === "22P02") return res.sendStatus(400);

    console.error(error);
    return res.sendStatus(500);
  }
};

export default unfollow;
