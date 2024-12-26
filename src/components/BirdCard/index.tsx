import clsx from "clsx";
import styles from "./styles.module.css";
import { useState } from "react";
import NotFoundImage from "@site/static/img/not-found.png";

export default function BirdCard({
  index,
  name,
  speciesCode,
  photo,
  recording,
}): JSX.Element {
  const [play, setPlay] = useState(false);

  return (
    <div className="col col--4">
      {recording && (
        <audio
          className={clsx(styles.audio)}
          id={`audio-${recording}`}
          src={`https://cdn.download.ams.birds.cornell.edu/api/v2/asset/${recording}/mp3`}
          preload="none"
        ></audio>
      )}
      <div className={`card shadow--tl margin-bottom--lg`}>
        <div className={clsx(styles.cardImage, "card__image")}>
          <img
            className={clsx(styles.photo)}
            loading="lazy"
            src={
              photo
                ? `https://cdn.download.ams.birds.cornell.edu/api/v1/asset/${photo}/640`
                : NotFoundImage
            }
          />
          {recording && (
            <>
              <img
                className={`card__image padding-top--none ${styles.spectrogram}`}
                loading="lazy"
                src={`https://cdn.download.ams.birds.cornell.edu/api/v2/asset/${recording}/default/preview`}
              />
            </>
          )}
        </div>
        <div className="card__body">
          <h4>
            <a href={`./birds/${speciesCode}`}>{name}</a>
            <span className={styles.alignRight}>#{index}</span>
          </h4>
        </div>
        <div className="card__footer ">
          {/* <div className="button-group button-group--block">
            <a
              className="button button--secondary"
              href={`https://ebird.org/species/${speciesCode}/`}
              target="_blank"
            >
              eBird
            </a>
            <button disabled={!photo} className="button button--secondary">
              {photo ? "📷" : "🙈"}
            </button>
            <button
              disabled={!recording}
              className="button button--secondary"
              onClick={() => {
                const audioElement = document.getElementById(
                  `audio-${recording}`
                ) as HTMLAudioElement;
                if (!play) {
                  audioElement.play();
                  setPlay(true);
                } else {
                  audioElement.pause();
                  setPlay(false);
                }
              }}
            >
              {recording ? (play ? "🔇" : "🔊") : "🙉"}
            </button>
          </div> */}
        </div>
      </div>
    </div>
  );
}
