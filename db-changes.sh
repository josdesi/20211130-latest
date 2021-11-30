#!/bin/bash

SHOULD_RUN_SEEDERS=$RUN_SEEDERS

echo "Running migrations"

ENV_SILENT=true node ace migration:run --force

if [ "$SHOULD_RUN_SEEDERS" = "true" ]
then
  echo "Running seeders"
  ENV_SILENT=true node ace seed --files 'DataBaseSeeder.js' --force
fi