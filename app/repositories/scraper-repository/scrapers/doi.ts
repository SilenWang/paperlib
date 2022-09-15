import { Response } from "got";

import { PaperEntity } from "@/models/paper-entity";
import { formatString } from "@/utils/string";

import { Scraper, ScraperRequestType } from "./scraper";

export class DOIScraper extends Scraper {
  preProcess(paperEntityDraft: PaperEntity): ScraperRequestType {
    const enable = paperEntityDraft.doi !== "" && this.getEnable("doi");
    const doiID = formatString({
      str: paperEntityDraft.doi,
      removeNewline: true,
      removeWhite: true,
    });
    const scrapeURL = `https://dx.doi.org/${doiID}`;
    const headers = {
      Accept: "application/json",
    };

    if (enable) {
      this.stateStore.logState.processLog = `Scraping metadata by DOI ...`;
    }

    return { scrapeURL, headers, enable };
  }

  parsingProcess(
    rawResponse: Response<string>,
    paperEntityDraft: PaperEntity
  ): PaperEntity {
    const response = JSON.parse(rawResponse.body) as {
      title: string;
      author: { given: string; family: string }[];
      published: {
        "date-parts": { "0": string[] };
      };
      type: string;
      "container-title": string;
      publisher: string;
      page: string;
      volume: string;
      issue: string;
    };
    const title = response.title;
    const authors = response.author
      .map((author) => {
        return author.given.trim() + " " + author.family.trim();
      })
      .join(", ");
    const pubTime = response.published["date-parts"]["0"][0];
    let pubType;
    if (response.type == "proceedings-article") {
      pubType = 1;
    } else if (response.type == "journal-article") {
      pubType = 0;
    } else {
      pubType = 2;
    }
    const publication = response["container-title"];

    paperEntityDraft.setValue("title", title);
    paperEntityDraft.setValue("authors", authors);
    paperEntityDraft.setValue("pubTime", `${pubTime}`);
    paperEntityDraft.setValue("pubType", pubType);
    paperEntityDraft.setValue("publication", publication);
    if (response.volume) {
      paperEntityDraft.setValue("volume", response.volume);
    }
    if (response.issue) {
      paperEntityDraft.setValue("number", response.issue);
    }
    if (response.page) {
      paperEntityDraft.setValue("pages", response.page);
    }
    if (response.publisher) {
      paperEntityDraft.setValue(
        "publisher",
        response.publisher ===
          "Institute of Electrical and Electronics Engineers (IEEE)"
          ? "IEEE"
          : response.publisher
      );
    }
    return paperEntityDraft;
  }
}