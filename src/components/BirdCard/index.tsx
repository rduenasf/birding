import clsx from "clsx";
import Heading from "@theme/Heading";
import styles from "./styles.module.css";
import { useState } from "react";

export default function BirdCard({
  index,
  name,
  speciesCode,
  photo,
  recording,
}): JSX.Element {
  const [play, setPlay] = useState(false);

  return (
    <div className="container">
      <div className="row padding-bottom--lg">
        <div className="col col--5">
          <div className="col-demo">
            <div className="card shadow--tl">
              {photo && (
                <img
                  className="card__image"
                  src={`https://cdn.download.ams.birds.cornell.edu/api/v1/asset/${photo}/640`}
                />
              )}
              {recording && (
                <img
                  className="card__image padding-top--none"
                  src={`https://cdn.download.ams.birds.cornell.edu/api/v2/asset/${recording}/default/preview`}
                />
              )}
              <div className="card__body text--center">
                <h4>
                  Lifer {index} - <a href={`./birds/${speciesCode}`}>{name}</a>
                </h4>
              </div>
              <div className="card__footer ">
                <div className="button-group button-group--block">
                  <button
                    disabled={!photo}
                    className="button button--secondary"
                  >
                    Photo {photo ? "📷" : "🙈"}
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
                    Audio {recording ? (play ? "🔇" : "🔊") : "🙉"}
                  </button>
                </div>
                <audio
                  id={`audio-${recording}`}
                  src={`https://cdn.download.ams.birds.cornell.edu/api/v2/asset/${recording}/mp3`}
                  preload="metadata"
                ></audio>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
