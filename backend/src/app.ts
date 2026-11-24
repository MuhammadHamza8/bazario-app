import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { errorHandler } from './middlewares/errorHandler';
import { notFound } from './middlewares/notFound';
import { UPLOAD_DIR } from './modules/uploads/upload.middleware';
import routes from './routes';

/**
 * Builds the Express app. Kept separate from server.ts so it can be tested
 * without opening a port.
 *
 * A request flows through the middlewares below IN ORDER:
 * helmet -> cors -> json parser -> routes -> notFound -> errorHandler
 */
const app = express();

// Helmet blocks other origins from loading our files by default; images must be loadable by the app.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })); // adds security-related HTTP headers
app.use(cors()); // lets the mobile/web app call this API (tighten the origin later)
app.use(express.json({ limit: '1mb' })); // parses JSON bodies into req.body

// Serves saved images: GET /uploads/<file> returns the file from the uploads folder.
app.use('/uploads', express.static(UPLOAD_DIR));

app.use('/api/v1', routes); // all real endpoints live here

app.use(notFound); // no route matched -> 404
app.use(errorHandler); // must be LAST: catches every error from above

export default app;
