'use strict';
const fs = require('fs');
const errorCodes = require('./ddf-error-codes');

module.exports = class {

  constructor(logger, folder) {
    this.logger = logger;
    this.folder = folder;
    const normalizedPath = require('../utils/path-normilize')(folder);
    const files$ = require('../utils/rx-recursive-readdir')(normalizedPath);
    this.folders$ = files$
      .filter(file => fs.lstatSync(file).isDirectory());

    if (!require('../utils/path-exists-sync')(normalizedPath)) {
      logger.error(errorCodes.err_folder_not_found.message(folder));
    }

    if (require('../utils/path-exists-sync')(normalizedPath)) {
      this.ddfFolders$ = this.folders$
        .filter(folder => require('../utils/path-is-ddf-folder-sync')(folder));
    }

    this.getValidator$ = () => this.ddfFolders$.count()
      .combineLatest([this.ddfFolders$.toArray(), this.folders$.count()],
        (ddfFoldersCount, ddfFolders, foldersCount) => {
          return {ddfFolders, ddfFoldersCount, foldersCount};
        });

    this.validate = res => {
      if (res.ddfFoldersCount === 0) {
        logger.error(errorCodes.err_folder_is_not_ddf_folder.message(this.folder));

        if (res.foldersCount === 1) {
          logger.error(errorCodes.err_folder_has_no_subfolders.message(this.folder));
          return;
        }

        logger.error(errorCodes.err_folder_has_no_ddf_subfolders.message(this.folder));
        return;
      }

      const plural = res.ddfFoldersCount === 1 ? '' : 's';
      logger.notice(`Found ${res.ddfFoldersCount} DDF folder${plural}, processing...:`);
      logger.notice(res.ddfFolders);
    }
  }
};
