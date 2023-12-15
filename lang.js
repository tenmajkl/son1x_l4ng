const re = /(?<channel_open>\>\>)|(?<channel_close>\<\<)|(?<symbol>[~|\^|\\\|_|\/|!|\*|@\-])|(?<number>[0-9]+)|(?<space>\s+)/g

function lex(code) {
    const tokens = [];
    let match;
    while (match = re.exec(code)) {
        const { groups } = match;
        if (groups.channel_open) {
            tokens.push({
                type: 'channel_open',
                value: groups.channel_open,
            })
        } else if (groups.channel_close) {
            tokens.push({
                type: 'channel_close',
                value: groups.channel_close,
            })
        } else if (groups.symbol) {
            tokens.push({
                type: 'symbol',
                value: groups.symbol,
            })
        } else if (groups.number) {
            tokens.push({
                type: 'number',
                value: groups.number,
            })
        } else if (groups.space) {
            continue;
        }else {
            return null;
        }
    }

    return tokens;
}

function parse(tokens) {
    let index = 0;
    let result = [];
    while (index < tokens.length) {
        switch (tokens[index].type) {
            case 'channel_open':
                index++;
                let channel = parseChannel(tokens, index);
                if (channel.error !== undefined) {
                    return channel;
                }
                result.push(channel.channel);
                index = channel.index;
                break;
            default: 
                return null;
        }
        index++;
    }

    return result;
}

const types = {
    '-': ['subtractive', parseSubtractiveSynthColor],
};

function parseChannel(tokens, index) {
    if (tokens[index].type !== 'symbol') {
        return {
            error: 'Expected symbol that determines channel type',
        };
    }
    let channel = {
    }; 
    let type = types[tokens[index].value];
    if (type == null) {
        return {
            error: 'Expected symbol that determines channel type',
        }
    }
    index++;
    channel.type = type[0];

    while (tokens[index].type !== 'channel_close') {
        let token = tokens[index];
        if (token.value == '/') {
            index++;
            let color = type[1](tokens, index);
            if (color.error !== undefined) {
                return color;
            }

            channel.color = color.color;
            index = color.index;
        }
    }

    return {
        channel: channel,
        index: index,
    }
}

function parseNumericValue(determiner, tokens, index) {
    if (tokens[index].value !== determiner) {
        return null;
    }

    index++;
    let result = tokens[index];
    if (result.type !== 'number') {
        return {
            error: 'Expected number, got ' + result.type
        };
    }
    index++;
    if (tokens[index].value !== determiner) {
        return {
            error: 'Unclosed ' + determiner
        };
    }
    return {
        value: result.value - 0,
        determiner: determiner,
        index: index + 1,
    }
}

const waveforms = {
    '~': 0,
    '^': 1, 
    '\\': 2,
    '_': 3,
};

function parseSubtractiveSynthColor(tokens, index) {
    let color = {
        waveforms: [],
        detune: 0,
        cutoff: 100,
        resonance: 0,
    }
    while (tokens[index].value !== '/') {
        let value = parseNumericValue('!', tokens, index) 
                    || parseNumericValue('*', tokens, index) 
                    || parseNumericValue('@', tokens, index)
        ;
        if (value !== null) {
            if (value.error !== undefined) {
                return value;
            }
            switch (value.determiner) {
                case '!': color.detune = value.value; break;
                case '*': color.cutoff = value.value; break;
                case '@': color.resonance = value.value; break;
            }
            index = value.index;
            continue;
        }

        if (waveforms[tokens[index].value] !== undefined) {
            color.waveforms.push(tokens[index].value);
            index++;
            continue;
        }

        return {
            error: 'unexpected token',
        }
    }
    index++;

    return {
        color: color,
        index: index,
    };
}

console.log(parse(lex('>>-/^\\\\___!100!@20@*80*/\'10\'x4x<<')));
