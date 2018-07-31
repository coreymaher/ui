import React from 'react';
import ReactTooltip from 'react-tooltip';
import { Link } from 'react-router-dom';
import heroes from 'dotaconstants/build/heroes.json';
import items from 'dotaconstants/build/items.json';
import patch from 'dotaconstants/build/patch.json';
import itemIds from 'dotaconstants/build/item_ids.json';
import xpLevel from 'dotaconstants/build/xp_level.json';
import curry from 'lodash/fp/curry';
import findLast from 'lodash/fp/findLast';
import inRange from 'lodash/fp/inRange';
import util from 'util';
// import SvgIcon from 'material-ui/SvgIcon';
import SocialPeople from 'material-ui/svg-icons/social/people';
import SocialPerson from 'material-ui/svg-icons/social/person';
import { TableLink } from '../components/Table';
import {
  KDA,
  TableHeroImage,
  FromNowTooltip,
} from '../components/Visualizations';
import constants from '../components/constants';
import store from '../store';

const second = 1;
const minute = second * 60;
const hour = minute * 60;
const day = hour * 24;
const month = day * 30;
const year = month * 12;

export const iconStyle = {
  position: 'relative',
  marginLeft: 5,
  width: 18,
  height: 18,
  verticalAlign: 'bottom',
  top: '1px',
};

export const subTextStyle = {
  fontSize: '12px',
  color: constants.colorMutedLight,
  textOverflow: 'initial',
  display: 'block',
  marginTop: '1px',
};

// TODO - add in the relevant text invocations of TableHeroImage
export const isRadiant = playerSlot => playerSlot < 128;

export function pad(n, width, z = '0') {
  const str = `${n}`;
  return str.length >= width ? str : new Array((width - str.length) + 1).join(z) + n;
}

export function formatSeconds(input) {
  if (!Number.isNaN(parseFloat(input)) && Number.isFinite(Number(input))) {
    const absTime = Math.abs(input);
    const minutes = Math.floor(absTime / 60);
    const seconds = pad(Math.floor(absTime % 60), 2);

    let time = ((input < 0) ? '-' : '');
    time += `${minutes}:${seconds}`;

    return time;
  }

  return null;
}

export function getLevelFromXp(xp) {
  for (let i = 0; i < xpLevel.length; i += 1) {
    if (xpLevel[i] > xp) {
      return i;
    }
  }

  return xpLevel.length;
}

export const calculateDistance = (x1, y1, x2, y2) =>
  (((x2 - x1) ** 2) + ((y2 - y1) ** 2)) ** 0.5;

export const calculateRelativeXY = ({ clientX, clientY, currentTarget }) => {
  // const bounds = target.getBoundingClientRect();
  // const x = clientX - bounds.left;
  // const y = clientY - bounds.top;
  let x = clientX + document.body.scrollLeft;
  let y = clientY + document.body.scrollTop;

  if (currentTarget.offsetParent) {
    let off = currentTarget.offsetParent;

    do {
      x -= off.offsetLeft;
      y -= off.offsetTop;
      off = off.offsetParent;
    } while (off);
  }

  return { x, y };
};

export const getPercentWin = (wins, games) => (games ? Number(((wins * 100) / games).toFixed(2)) : 0);

export const camelToSnake = str =>
  str.replace(/\.?([A-Z]+)/g, (match, group) => `_${group.toLowerCase()}`).replace(/^_/, '');

export const getOrdinal = (n) => {
  // TODO localize
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const jsonFn = json =>
  arrayFn =>
    fn =>
      json[Object.keys(json)[arrayFn]((key, index) => fn(json[key], index))];

export const percentile = (pct) => {
  if (pct >= 0.8) {
    return {
      color: 'green',
      grade: 'A',
    };
  } else if (pct >= 0.6) {
    return {
      color: 'blue',
      grade: 'B',
    };
  } else if (pct >= 0.4) {
    return {
      color: 'golden',
      grade: 'C',
    };
  } else if (pct >= 0.2) {
    return {
      color: 'yelor',
      grade: 'D',
    };
  }
  return {
    color: 'red',
    grade: 'F',
  };
};

export const IMAGESIZE_ENUM = {
  SMALL: 'sb.png', //     ~10KB (59 px x 33 px)
  MEDIUM: 'lg.png', //     ~41KB (205 px x 105 px)
  LARGE: 'full.png', // ~52KB (256 px x 144 px)
  VERT: 'vert.jpg', // ~18KB (235 px x 272 px) note that this is a jpg

// if you ever wanna see what the above look like (change the suffix):
// https://api.opendota.com/apps/dota2/images/heroes/abaddon_full.png
};

const getTitle = (row, col, heroName) => {
  if (row.match_id && row.player_slot !== undefined) {
    return <TableLink to={`/matches/${row.match_id}`}>{heroName}</TableLink>;
  }
  return <TableLink to={`/heroes/${row[col.field]}`}>{heroName}</TableLink>;
};

export const getHeroImageUrl = (heroId, imageSizeSuffix) => {
  let imageUrl = heroes[heroId] && process.env.REACT_APP_API_HOST + heroes[heroId].img; // "[api url]/abaddon_full.png?"
  if (imageUrl) {
    imageUrl = imageUrl.slice(0, -('full.png?'.length)); // "[api url]/abaddon"
  }
  return imageUrl + imageSizeSuffix;
};

// Fills in a template with the values provided in the dict
// returns a list, so react object don't have to be converted to a string
// Any keys not found in the given dictionary are simply left untouched
// brackets can be escaped with \
// Examples:
// formatTemplate("{person} name is {name}", { person: "My", name: "Gaben" });
// returns [ "My", " name is ", "Gaben" ]
// formatTemplate("{person} name is {name}", { name: <font color={styles.golden}>{"Gaben"}</font> });
// returns [ "{person} name is ", <font color={styles.golden}>{"Gaben"}</font> ]
export const formatTemplate = (template, dict) => {
  if (!template) {
    return ['(invalid template)'];
  }
  const pattern = /(\{[^}]+\})/g;
  let result = template.split(pattern);
  for (let i = 0; i < result.length; i += 1) {
    if (result[i].match(pattern) && result[i].slice(1, -1) in dict) {
      result[i] = dict[result[i].slice(1, -1)];
    }
  }
  result = result.filter(part => part !== '');
  return result;
};

export const defaultSort = (array, sortState, sortField, sortFn) =>
  array.sort((a, b) => {
    const sortFnExists = typeof sortFn === 'function';
    const aVal = (sortFnExists ? sortFn(a) : a[sortField]) || 0;
    const bVal = (sortFnExists ? sortFn(b) : b[sortField]) || 0;
    const desc = aVal < bVal ? 1 : -1;
    const asc = aVal < bVal ? -1 : 1;
    return sortState === 'desc' ? desc : asc;
  });

export const SORT_ENUM = {
  0: 'asc',
  1: 'desc',
  asc: 0,
  desc: 1,
  next: state => SORT_ENUM[(state >= 1 ? 0 : state + 1)],
};

export function getObsWardsPlaced(pm) {
  if (!pm.obs_log) {
    return 0;
  }

  return pm.obs_log.filter(l => !l.entityleft).length;
}

export function isSupport(pm) {
  return getObsWardsPlaced(pm) >= 2 && pm.lh_t && pm.lh_t[10] < 20;
}

export function isRoshHero(pm) {
  const roshHeroes = {
    npc_dota_hero_lycan: 1,
    npc_dota_hero_ursa: 1,
    npc_dota_hero_troll_warlord: 1,
  };

  return heroes[pm.hero_id] && (heroes[pm.hero_id].name in roshHeroes);
}

export function isActiveItem(key) {
  const whitelist = {
    branches: 1,
    bloodstone: 1,
    radiance: 1,
  };

  // TODO this will only work for english data files
  return (items[key].desc.indexOf('Active: ') > -1 && !(key in whitelist));
}

export const sum = (a, b) => a + b;

export const extractTransitionClasses = _styles => name => ({
  enter: _styles[`${name}-enter`],
  enterActive: _styles[`${name}-enter-active`],
  leave: _styles[`${name}-leave`],
  leaveActive: _styles[`${name}-leave-active`],
  appear: _styles[`${name}-appear`],
  appearActive: _styles[`${name}-appear-active`],
});

export const gameCoordToUV = (x, y) => ({
  x: Number(x) - 64,
  y: 127 - (Number(y) - 64),
});

// TODO: refactor this to use gameCoordToUV
/**
 * Unpacks position data from hash format to array format
 * 64 is the offset of x and y values
 * subtracting y from 127 inverts from bottom/left origin to top/left origin
 * */
export function unpackPositionData(input) {
  if (typeof input === 'object' && !Array.isArray(input)) {
    const result = [];

    Object.keys(input).forEach((x) => {
      Object.keys(input[x]).forEach((y) => {
        result.push({
          x: Number(x) - 64,
          y: 128 - (Number(y) - 64),
          value: input[x][y],
        });
      });
    });

    return result;
  }

  return input;
}

export const threshold = curry((start, limits, values, value) => {
  if (limits.length !== values.length) throw new Error('Limits must be the same as functions.');

  const limitsWithStart = limits.slice(0);
  limitsWithStart.unshift(start);

  return findLast((v, i) => inRange(limitsWithStart[i], limitsWithStart[i + 1], value), values);
});

export const getTeamLogoUrl = (logoUrl) => {
  if (!logoUrl) {
    return '';
  }
  // Use proxy layer to serve team logos
  if (logoUrl.indexOf('/ugc') !== -1) {
    return `${process.env.REACT_APP_API_HOST}${logoUrl.substr(logoUrl.indexOf('/ugc'))}`;
  }
  return logoUrl;
};

/**
 * Converts an HSV color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes h, s, and v are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  v       The value
 * @return  Array           The RGB representation
 */
export const hsvToRgb = (h, s, v) => {
  let r;
  let g;
  let b;

  const i = Math.floor(h * 6);
  const f = (h * 6) - i;
  const p = v * (1 - s);
  const q = v * (1 - (f * s));
  const t = v * (1 - ((1 - f) * s));

  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
    default: r = v; g = t; b = p;
  }

  return [r * 255, g * 255, b * 255];
};

export const bindWidth = (width, maxWidth) => Math.min(width, maxWidth);

export const getHeroesById = () => {
  const obj = {};
  Object.keys(heroes).forEach((hero) => {
    obj[heroes[hero].name] = heroes[hero];
  });
  return obj;
};

// https://www.evanmiller.org/how-not-to-sort-by-average-rating.html
export const wilsonScore = (up, down) => {
  if (!up) return 0;
  const n = up + down;
  const z = 1.64485; // 1.0 = 85%, 1.6 = 95%
  const phat = up / n;
  return (
    phat + ((z * z) / (2 * n)) - (z * Math.sqrt(((phat * (1 - phat)) + (z * z / (4 * n))) / n))
  ) / (
    1 + (z * z / n)
  );
};

export const groupBy = (xs, key) =>
  xs.reduce((rv, x) => {
    (rv[x[key]] = rv[x[key]] || []).push(x); // eslint-disable-line no-param-reassign
    return rv;
  }, {});

export function groupByArray(xs, key) {
  return xs.reduce((rv, x) => {
    const v = key instanceof Function ? key(x) : x[key];
    const el = rv.find(r => r && r.key === v);
    if (el) {
      el.values.push(x);
    } else {
      rv.push({
        key: v,
        values: [x],
      });
    }
    return rv;
  }, []);
}

export const sumValues = f => Object.values(f).reduce((a, b) => a + b);

/* eslint-disable camelcase */
// https://dota2.gamepedia.com/Attributes
export function compileLevelOneStats(hero) {
  if (!hero) {
    return {};
  }

  const statsBonuses = {
    str: {
      attackDamage: 1,
      armor: 0.16,
      health: 22.5,
      health_regen: 0.69,
      mana: 12,
      mana_regen: 1.8,
      mr: 0.1,
      move_speed: 0.05,
      attack_speed: 1,

    },
    int: {
      attackDamage: 1,
      armor: 0.16,
      health: 18,
      health_regen: 0.55,
      mana: 15,
      mana_regen: 2.25,
      mr: 0.08,
      move_speed: 0.05,
      attack_speed: 1,

    },
    agi: {
      attackDamage: 1,
      armor: 0.2,
      health: 18,
      health_regen: 0.55,
      mana: 12,
      mana_regen: 1.8,
      mr: 0.08,
      move_speed: 0.063,
      attack_speed: 1.25,
    },
  };

  const round = value => Math.round(value * 100) / 100;

  const {
    primary_attr,
    base_attack_max,
    base_attack_min,
    base_armor,
    base_health,
    base_health_regen,
    base_mana,
    base_mana_regen,
    base_mr,
    base_move_speed,
    attack_rate,
  } = hero;

  const primaryAttrValue = hero[`base_${primary_attr}`];
  const [agiValue, strValue, intValue] = [hero.base_agi, hero.base_str, hero.base_int];


  return {
    ...hero,
    base_attack_min: base_attack_min + (statsBonuses[primary_attr].attackDamage * primaryAttrValue),
    base_attack_max: base_attack_max + (statsBonuses[primary_attr].attackDamage * primaryAttrValue),
    base_armor: round(base_armor + (statsBonuses[primary_attr].armor * agiValue)),
    base_health: round(base_health + (statsBonuses[primary_attr].health * strValue)),
    base_health_regen: round(base_health_regen + (base_health_regen * (statsBonuses[primary_attr].health_regen * strValue / 100))),
    base_mana: round(base_mana + (statsBonuses[primary_attr].mana * intValue)),
    base_mana_regen: round(base_mana_regen + (base_mana_regen * (statsBonuses[primary_attr].mana_regen * intValue / 100))),
    base_mr: round(base_mr + (base_mr * (statsBonuses[primary_attr].mr * strValue / 100))),
    base_move_speed: round(base_move_speed + (base_move_speed * (statsBonuses[primary_attr].move_speed * agiValue / 100))),
    attack_rate: round(1.7 / (attack_rate / (1 + ((statsBonuses[primary_attr].attack_speed * agiValue) / 100))) * 100), // ingame representation of attack speed
  };
}
/* eslint-enable camelcase */

export const getTeamName = (team, _isRadiant) => {
  const { strings } = store.getState().app;
  if (_isRadiant) {
    return (team && team.name) ? team.name : strings.general_radiant;
  }

  return (team && team.name) ? team.name : strings.general_dire;
};

export function abbreviateNumber(num) {
  const { strings } = store.getState().app;
  if (!num) {
    return '-';
  } else if (num >= 1000 && num < 1000000) {
    return `${Number((num / 1000).toFixed(1))}${strings.abbr_thousand}`;
  } else if (num >= 1000000 && num < 1000000000) {
    return `${Number((num / 1000000).toFixed(1))}${strings.abbr_million}`;
  } else if (num >= 1000000000 && num < 1000000000000) {
    return `${Number((num / 1000000000).toFixed(1))}${strings.abbr_billion}`;
  } else if (num >= 1000000000000) {
    return `${Number((num / 1000000000000).toFixed(1))}${strings.abbr_trillion}`;
  }

  return num.toFixed(0);
}

export function rankTierToString(rankTier) {
  const { strings } = store.getState().app;
  if (rankTier !== parseInt(rankTier, 10)) {
    return strings.general_unknown;
  }
  const intRankTier = parseInt(rankTier, 10);
  let rank = strings[`rank_tier_${parseInt(intRankTier / 10, 10)}`];
  if (intRankTier > 9) {
    rank += ` [${parseInt(intRankTier % 10, 10)}]`;
  }
  return rank;
}

export function fromNow(time) {
  const { strings } = store.getState().app;

  const units = [{
    name: strings.time_s,
    plural: strings.time_ss,
    limit: minute,
    in_seconds: second,
  }, {
    name: strings.time_m,
    plural: strings.time_mm,
    limit: hour,
    in_seconds: minute,
  }, {
    name: strings.time_h,
    plural: strings.time_hh,
    limit: day,
    in_seconds: hour,
  }, {
    name: strings.time_d,
    plural: strings.time_dd,
    limit: month,
    in_seconds: day,
  }, {
    name: strings.time_M,
    plural: strings.time_MM,
    limit: year,
    in_seconds: month,
  }, {
    name: strings.time_y,
    plural: strings.time_yy,
    limit: null,
    in_seconds: year,
  }];

  const diff = (new Date() - new Date(time * 1000)) / 1000;

  if (diff < 5) {
    return strings.time_just_now;
  }

  for (let i = 0; i < units.length; i += 1) {
    const unit = units[i];

    if (diff < unit.limit || !unit.limit) {
      const val = Math.floor(diff / unit.in_seconds);
      return util.format(strings.time_past, val > 1 ? util.format(unit.plural, val) : unit.name);
    }
  }

  return '';
}

export function displayHeroId(row, col, field, showGuide = false, imageSizeSuffix = IMAGESIZE_ENUM.SMALL, guideUrl, guideType) {
  const { strings } = store.getState().app;
  const heroName = heroes[row[col.field]] ? heroes[row[col.field]].localized_name : strings.general_no_hero;
  const imageUrl = getHeroImageUrl(row[col.field], imageSizeSuffix);
  const getSubtitle = (row) => {
    if (row.match_id && row.player_slot !== undefined) {
      let lane;
      let tooltip;
      if (row.is_roaming) {
        tooltip = strings.roaming;
        lane = 'roam';
      } else {
        tooltip = strings[`lane_role_${row.lane_role}`];
        lane = row.lane_role;
      }
      const roleIconStyle = {
        position: 'absolute',
        height: '15px',
        marginLeft: '5px',
        filter: 'grayscale(40%)',
        top: '2px',
      };

      return (
        <span>
          <span>{(isRadiant(row.player_slot) ? strings.general_radiant : strings.general_dire)}</span>
          {lane ?
            <img
              src={`/assets/images/dota2/lane_${lane}.svg`}
              alt=""
              data-tip={tooltip}
              data-offset="{'right': 4, 'top': 4}"
              data-delay-show="300"
              style={roleIconStyle}
            />
          : ''}
        </span>);
    } else if (row.last_played) {
      return <FromNowTooltip timestamp={row.last_played} />;
    } else if (row.start_time) {
      return <FromNowTooltip timestamp={row.start_time} />;
    }

    return null;
  };

  return (
    <TableHeroImage
      parsed={row.version}
      image={imageUrl}
      title={getTitle(row, col, heroName)}
      subtitle={getSubtitle(row)}
      heroName={heroName}
      showGuide={showGuide}
      guideUrl={guideUrl}
      guideType={guideType}
      leaverStatus={row.leaver_status}
      hero={compileLevelOneStats(heroes[row.hero_id])}
    />
  );
}

export function displayHeroIdWithPvgna(row, col, field) {
  return displayHeroId(row, col, field, true, IMAGESIZE_ENUM.SMALL, row.pvgnaGuide && row.pvgnaGuide.url, 'PVGNA');
}

export function displayHeroIdWithMoreMmr(row, col, field) {
  let url = 'https://moremmr.com/en/heroes/';
  if (heroes[row[col.field]] && heroes[row[col.field]].localized_name) {
    const heroName = heroes[row[col.field]].localized_name.toLowerCase().replace(' ', '-');
    url = `https://moremmr.com/en/heroes/${heroName}/videos?utm_source=opendota&utm_medium=heroes&utm_campaign=${heroName}`;
  }

  return displayHeroId(row, col, field, true, IMAGESIZE_ENUM.SMALL, url, 'MOREMMR');
}

/**
 * Transformations of table cell data to display values.
 * These functions are intended to be used as the displayFn property in table columns.
 * This is why they all take (row, col, field)
 * */
// TODO - these more complicated ones should be factored out into components
export const transformations = {
  match_id: (row, col, field) => <Link to={`/matches/${field}`}>{field}</Link>,
  match_id_with_time: (row, col, field) => (
    <div>
      <TableLink to={`/matches/${field}`}>{field}</TableLink>
      <span style={{ ...subTextStyle, display: 'block', marginTop: 1 }}>
        {fromNow(row.start_time)}
      </span>
    </div>),
  radiant_win_and_game_mode: (row, col, field) => {
    const matchId = row.match_id;
    const { strings } = store.getState().app;
    const partySize = (_partySize) => {
      if (_partySize === 1) {
        return [
          <SocialPerson color="rgb(179, 179, 179)" style={iconStyle} />,
          `x${row.party_size}`,
        ];
      } else if (_partySize === null || _partySize === undefined) {
        return null;
      }

      return [
        <SocialPeople color="rgb(179, 179, 179)" style={iconStyle} />,
        `x${row.party_size}`,
      ];
    };
    const won = field === isRadiant(row.player_slot);
    const getColor = (result) => {
      if (result === null || result === undefined) {
        return constants.colorMuted;
      }
      return won ? constants.colorGreen : constants.colorRed;
    };
    const getString = (result) => {
      if (result === null || result === undefined) {
        return strings.td_no_result;
      }
      return won ? strings.td_win : strings.td_loss;
    };
    const skillDotsStyle = {
      height: '5px',
      width: '5px',
      backgroundColor: constants.lightGray,
      display: 'inline-block',
      marginLeft: '3px',
      marginBottom: '2px',
      transform: 'rotate(45deg)',
    };
    const getSkill = (skill) => {
      const skillDots = [];
      if (skill) {
        for (let i = 0; i < 3; i += 1) {
          skillDots.push(<div style={{ ...skillDotsStyle, opacity: skill - i > 0 ? '1' : '0.3' }} />);
        }
      }
      return skillDots;
    };
    const lobbyTypeStyle = { color: row.lobby_type === 7 ? constants.colorRanked : undefined };

    return (
      <div>
        <TableLink to={`/matches/${matchId}`} color={getColor(field)}>
          <span style={{ color: getColor(field) }}>
            {getString(field)}
          </span>
        </TableLink>
        <span style={{ ...subTextStyle, display: 'block', marginTop: 1 }}>
          {strings[`game_mode_${row.game_mode}`] && (`${strings[`game_mode_${row.game_mode}`]} / `)} {row.league_name ? row.league_name : <span style={lobbyTypeStyle}>{strings[`lobby_type_${row.lobby_type}`]}</span>}
          <span style={{ marginRight: '3px' }} data-tip={`${strings.filter_party_size} ${row.party_size}`} data-offset="{'top': 4, 'right' : 20}" data-delay-show="300">
            {partySize(row.party_size)}
          </span>
          <span data-tip={row.skill ? `${strings[`skill_${row.skill}`]} ${strings.th_skill}` : ''} data-offset="{'right': 17}" data-delay-show="300">
            {getSkill(row.skill)}
          </span>
          <ReactTooltip place="top" effect="solid" />
        </span>
      </div>);
  },
  start_time: (row, col, field) => <FromNowTooltip timestamp={field} />,
  last_played: (row, col, field) => <FromNowTooltip timestamp={field} />,
  duration: (row, col, field) => (
    <div>
      <span>
        {formatSeconds(field)}
      </span>
      {row &&
        <span style={{ ...subTextStyle, display: 'block', marginTop: 1 }}>
          <FromNowTooltip timestamp={row.start_time + row.duration} />
        </span>}
    </div>
  ),
  patch: (row, col, field) => (patch[field] ? patch[field].name : field),
  winPercent: (row, col, field) => `${(field * 100).toFixed(2)}%`,
  kda: (row, col, field) => <KDA kills={field} deaths={row.deaths} assists={row.assists} />,
  rank: (row, col, field) => getOrdinal(field),
  rank_percentile: row => (
    <span style={{ color: constants[percentile(row.rank / row.card).color] }}>
      {getPercentWin(row.rank, row.card).toFixed(2)}%
    </span>
  ),
  player: row => (
    <TableHeroImage
      image={row.avatar || row.avatarfull}
      title={row.name || row.personaname}
      subtitle={row.subtitle || (row.last_played && <FromNowTooltip timestamp={row.last_played} />)}
      registered={row.last_login}
      accountId={row.account_id}
    />
  ),
};

/* ---------------------------- match item_n transformations ---------------------------- */
// This code is used to transform the items in the match.players (array of players with match data).
// the items for each player are stored as item_0, item_1, ..., item_5. If there is no item, we
// have a value of 0 there, so we return false for those cases so we don't render a broken image link.
// Otherwise, we just put the url in the image. THis will also contain the tooltip stuff as well
// (once I get to the tooltips).

const transformMatchItem = ({
  field,
}) => {
  if (field === 0) {
    return false;
  }
  return `${process.env.REACT_APP_API_HOST}${items[itemIds[field]].img}`;
};

for (let i = 0; i < 6; i += 1) {
  transformations[`item_${i}`] = transformMatchItem;
}
