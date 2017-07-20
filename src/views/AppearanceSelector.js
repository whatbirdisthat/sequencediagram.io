import React from 'react'
import { toggleMessageLineStyle, toggleMessageArrowStyle } from './../reducers'
import messageBorders from './message-borders.png'
import messageBordersDashed from './message-borders-dashed.png'
import messageBordersAsync from './message-borders-async.png'

export default function(props) {
    const { dispatch, message, layout, controlsColor } = props;
    const key = message.key;

    const eatMouseDown = {
        onMouseDown: e => {
            // We don't want the parent div to receive any mouse down event if
            // this item is clicked
            e.stopPropagation();
            e.preventDefault();
        }
    }

    const pointsLeft = layout[key].pointsLeft;

    const borderStyle = controlsColor === 'transparent' ? 'none' : 'solid';

    const pngLine = message.isReply ? messageBorders : messageBordersDashed;
    const pngArrow = message.isAsync ? messageBorders : messageBordersAsync;

    const borderImageLine = 'url(' + pngLine + ') 0 9 17 fill repeat';
    const borderImageArrow = 'url(' + pngArrow + ') 0 9 17 fill repeat';

    const outlineStyle = {
        width: 30,
        height: 30,
        border: '1px dotted ' + controlsColor,
        borderRadius: 15,
    };

    return (
        <div style={{
                position: 'absolute',
                left: '50%',
                bottom: -45,
                background: 'transparent',
                }}>
            <div style={{
                    display: 'flex',
                    position: 'relative',
                    left: '-50%',
                    }}>
                <div className="message-end" onClick={() => dispatch(toggleMessageLineStyle(key))} {...eatMouseDown} style={outlineStyle}>
                    <div style={{
                            borderStyle,
                            borderWidth: '0px 0px 17px 0px',
                            borderImage: borderImageLine,
                            height: 6,
                            }} />
                </div>
                <div className="message-end" onClick={() => dispatch(toggleMessageArrowStyle(key))} {...eatMouseDown} style={outlineStyle}>
                    <div style={{
                            position: 'relative',
                            left: 8,
                            top: 8,
                            borderStyle,
                            borderWidth: (pointsLeft ?
                                          '0px 0px 17px 9px' :
                                          '0px 9px 17px 0px'),
                            borderImage: borderImageArrow,
                            width: 3,
                            height: 1,
                            }} />
                </div>
            </div>
        </div>
    );
}