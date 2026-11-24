import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import * as controller from './listing.controller';
import { createListingSchema, feedSchema, listingIdSchema, updateListingSchema } from './listing.schema';

const router = Router();

router.get('/', validate(feedSchema), asyncHandler(controller.feed)); // public feed
router.post('/', authenticate, validate(createListingSchema), asyncHandler(controller.create));

// "/mine" MUST be declared before "/:id", otherwise Express would treat
// the word "mine" as an id.
router.get('/mine', authenticate, asyncHandler(controller.mine));

router.get('/:id', validate(listingIdSchema), asyncHandler(controller.getOne)); // public
router.patch('/:id', authenticate, validate(updateListingSchema), asyncHandler(controller.update));
router.delete('/:id', authenticate, validate(listingIdSchema), asyncHandler(controller.remove));

export default router;
