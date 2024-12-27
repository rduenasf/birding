import clsx from "clsx";
import styles from "./styles.module.css";
import { useState, useRef } from "react";
import NotFoundImage from "@site/static/img/not-found.png";

export default function BirdCard({
  index,
  name,
  speciesCode,
  photo,
  recording,
}): JSX.Element {
  const [play, setPlay] = useState(false);

  const audioRef = useRef(null);

  return (
    <div className="col col--4">
      {recording && (
        <audio
          className={clsx(styles.audio)}
          ref={audioRef}
          src={`https://cdn.download.ams.birds.cornell.edu/api/v2/asset/${recording}/mp3`}
          preload="none"
        ></audio>
      )}
      <div className={`card shadow--tl`}>
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
            <div className={clsx(styles.spectrogram)}>
              <img
                className={`padding-top--none`}
                loading="lazy"
                src={`https://cdn.download.ams.birds.cornell.edu/api/v2/asset/${recording}/default/preview`}
              />
              <a
                onClick={() => {
                  if (!play) {
                    audioRef.current.play();
                    setPlay(true);
                  } else {
                    audioRef.current.pause();
                    setPlay(false);
                  }
                }}
              >
                {play ? "⏸️" : "▶️"}
              </a>
            </div>
          )}
        </div>
        <div className="card__body">
          <h4>
            <a href={`./birds/${speciesCode}`}>{name}</a>
            <span className={styles.alignRight}>#{index}</span>
          </h4>
        </div>
      </div>
    </div>
  );
}
