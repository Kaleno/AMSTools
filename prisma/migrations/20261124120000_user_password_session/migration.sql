-- Existing rows keep working: mustChangePassword defaults to false and
-- sessionVersion defaults to 0, which matches JWTs issued before this column.
ALTER TABLE `User`
    ADD COLUMN `mustChangePassword` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `sessionVersion` INTEGER NOT NULL DEFAULT 0;
