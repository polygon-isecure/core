import { sql } from "slonik";
import Express from "express";
import slonik from "../../db/slonik";
import textCleaner from "../../helpers/textCleaner";

export const fetchOne = async (req: Express.Request, res: Express.Response) => {
  const { post: postId } = req.params;

  const {
    rows: { 0: post },
  } = await slonik.query(sql`
      SELECT
        post.id,
        post.body,
        post.privacy,
        post.created_at,
        row_to_json(author) AS user,
        json_agg(comments) AS comments

      FROM posts post
        LEFT OUTER JOIN
          (SELECT first_name, last_name, avatar, id, username FROM users) author
            ON post.user_id = author.id

        LEFT OUTER JOIN comments ON comments.post_id = post.id

      WHERE post.id = ${postId.toString()} GROUP BY post.id, author.* ORDER BY post.created_at DESC;
  `);

  if (post) return res.json(post);
  else return res.status(403).json();
};

export const fetch = async (req: Express.Request, res: Express.Response) => {
  const { username, page } = req.query;

  if (!username) {
    const { rows: posts } = await slonik.query(sql`
        SELECT
          Post.*,
          to_json(Author) AS user,
          to_json(array_remove(array_agg(Comments), NULL)) AS comments

        FROM posts Post

        LEFT OUTER JOIN (
          SELECT 
            id, 
            avatar, 
            private, 
            username, 
            last_name, 
            first_name 
          
          FROM users
          ) Author ON Author.id = Post.user_id
        
        LEFT OUTER JOIN (
          
          SELECT
            Comment.*,
            to_json(CommentAuthor) AS user

          FROM comments Comment

          LEFT OUTER JOIN (

            SELECT 
              id, 
              bio,
              avatar, 
              username, 
              first_name, 
              last_name
            
            FROM users
            ) CommentAuthor ON Comment.user_id = CommentAuthor.id
            
        ) Comments ON Post.id  = Comments.post_id

        WHERE Post.privacy <> 'PRIVATE'
        GROUP BY Post.id, Author.*, Comments.*
        ORDER BY Post.created_at DESC
        LIMIT 2 OFFSET ${(Number(page) || 0) * 2}
    `);

    return res.json(posts);
  } else {
    const { rows: posts } = await slonik.query(sql`
        SELECT
          Post.*,
          to_json(Author) AS user,
          to_json(array_remove(array_agg(Comments), NULL)) AS comments

        FROM posts Post

        LEFT OUTER JOIN (
          SELECT 
            id, 
            avatar, 
            private, 
            username, 
            last_name, 
            first_name 
          
          FROM users
          ) Author ON Author.id = Post.user_id
        
        LEFT OUTER JOIN (
          SELECT
            Comment.*,
            to_json(CommentAuthor) AS user

          FROM comments Comment

          LEFT OUTER JOIN (
            SELECT 
              id, 
              bio,
              avatar, 
              username, 
              first_name, 
              last_name
            
            FROM users
            ) CommentAuthor ON Comment.user_id = CommentAuthor.id
        ) Comments ON Post.id  = Comments.post_id

        WHERE Post.privacy <> 'PRIVATE'
        AND Author.username = ${String(username)}
        GROUP BY Post.id, Author.*, Comments.*
        ORDER BY Post.created_at DESC
        LIMIT 2 OFFSET ${(Number(page) || 0) * 2}
    `);

    return res.json(posts);
  }
};

export const create = async (req: Express.Request, res: Express.Response) => {
  // If no text is present prevent the user from posting
  if (!req.body.body) return res.status(401).json();
  else {
    // Post text
    const text = textCleaner(req.body.body);

    // Checking if there are no uploaded files
    if (req.files?.length === 0) {
      // Create new post
      const {
        rows: { 0: postId },
      } = await slonik.query(sql`
        INSERT INTO posts (body, user_id)
        VALUES (${text}, ${req.user?.id!!})

        RETURNING id;
      `);

      const {
        rows: { 0: post },
      } = await slonik.query(sql`
        SELECT
          Post.*,
          to_json(Author) AS user,
          to_json(array_remove(array_agg(Comments), NULL)) AS comments

        FROM posts Post

        LEFT OUTER JOIN (
          SELECT 
            id, 
            avatar, 
            private, 
            username, 
            last_name, 
            first_name 
          
          FROM users
          ) Author ON Author.id = Post.user_id
        
        LEFT OUTER JOIN (
          
          SELECT
            Comment.*,
            to_json(CommentAuthor) AS user

          FROM comments Comment

          LEFT OUTER JOIN (
            SELECT 
              id, 
              bio,
              avatar, 
              username, 
              first_name, 
              last_name
            
            FROM users
            ) CommentAuthor ON Comment.user_id = CommentAuthor.id
            
        ) Comments ON Post.id  = Comments.post_id

        WHERE Post.privacy <> 'PRIVATE'
        GROUP BY Post.id, Author.*, Comments.*
        ORDER BY Post.created_at DESC;
      `);

      // Sending the response
      return res.json(post);
    } else {
      // TODO: Implement
    }
  }
};

// For removing a post
export const remove = async (req: Express.Request, res: Express.Response) => {
  try {
    // Getting post id from the query
    const { id } = req.params;
    // Deleting from the database
    const {
      rows: { 0: post },
    } = await slonik.query(sql`
      SELECT * FROM posts WHERE id = ${id.toString()};
    `);

    // Checking if the post exists
    if (post) {
      // If the author of the post is the same as current user
      if (post?.user_id === req.user?.id) {
        await slonik.query(sql`
        DELETE FROM posts WHERE id = ${id.toString()};
      `);
        // Sending "No content response"
        return res.status(204).json();
      } else return res.status(403).json();
    } else return res.status(404).json();
  } catch (error) {
    console.error(error);
    return res.status(500).json();
  }
};
