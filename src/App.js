import React, { Component } from 'react';
import './App.css';

const appId = "YOUR_APP_ID_HERE";
const FB = window.FB;

class Facebook {
    constructor(appId) {
        this.appId = appId;
        FB.init({ appId })
    }
    
    async login(scope) {
        return new Promise((resolve, reject) => {
            FB.login(response => {
                if (response.authResponse) {
                    resolve(response)
                    return
                }
                
                reject(response)
            }, scope)
        })
    }
    
    async logout() {
        return new Promise((resolve, reject) => {
            FB.logout(resolve);
        })
    }
    
    async status() {
        return new Promise((resolve, reject) => {
            FB.getLoginStatus(response => {
                if (response.status === "connected") {
                    resolve(response)
                    return
                }
                
                reject(response)
            })
        })
    }
    
    async api(query, method, params) {
        if (typeof method === "object") {
            params = method
            method = 'get'
        }
        
        return new Promise((resolve, reject) => {
            FB.api(query, method, params, response => {
                if (!response || response.error) {
                    reject(response);
                    return;
                }
                
                resolve(response)
            })
        })
    }
}

class App extends Component {
    
    constructor(props) {
        super(props)
        
        this.facebook = new Facebook(appId)
        this.state = {
            user: undefined,
            groups: [],
            step: "group",
            loading: true,
            publishing: false,
            payload: { message: '', link: '' },
        }
    }
    
    fetchGroups() {
        const { groups } = this.state.user;
        const hasNext = groups.hasOwnProperty('paging') && groups.paging.hasOwnProperty('next');
        let states = { groups: this.state.groups.concat(groups.data) };
        if (!hasNext) {
            states.loading = false;
        }
        
        this.setState(states, () => {
            if (hasNext) {
                this.fetchGroup(groups.paging.next)
                .then(() => {
                    this.setState({ loading: false })
                })
            }
        })
        
    }
    
    fetchGroup(next) {
        return fetch(next)
        .then(response => response.json())
        .then(groups => {
            const hasNext = groups.hasOwnProperty('paging') && groups.paging.hasOwnProperty('next');
            this.setState({ groups: this.state.groups.concat(groups.data)}, () => {
                if (hasNext) {
                    this.fetchGroup(groups.paging.next)
                } else {
                    this.setState({ loading: false })
                }
            })
        });
    }
    
    fetchUserData() {
        this.facebook.api('/me?fields=name,groups{id,name,icon}')
        .then((user) => {
            this.setState({ user }, () => {
                this.fetchGroups();
            })
        })
        .catch(console.error)
    }
    
    login() {
        this.setState({ user: undefined, groups: [], payload: { message: '', link: '' }}, () => {
            this.facebook.login({ scope: 'publish_actions,user_groups'})
            .then(() => {
                this.fetchUserData();
            })
        })
    }
    
    logout() {
        this.facebook.logout().then(() => {
            this.setState({ user: undefined, groups: [], payload: { message: '', link: '' }})
        })
    }
    
    renderFacebookButton() {
        if (this.state.user) {
            return <button className="button" onClick={() => this.logout() }>Logout</button>
        }
        
        return <button className="button" onClick={() => this.login() }>Start!</button>
    }
    
    renderLoading() {
        return (
        <div className="sk-three-bounce loader">
            <div className="sk-child sk-bounce1"></div>
            <div className="sk-child sk-bounce2"></div>
            <div className="sk-child sk-bounce3"></div>
        </div>
        )
    }
    
    toggleSelect(groupId) {
        let groups = this.state.groups.map(item => {
            if (item.id === groupId) {
                item.selected = !item.selected;
            }
            return item
        })
        
        this.setState({ groups })
    }
    
    renderGroups() {
        return (
        <div>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Group</th>
                    </tr>
                </thead>
                <tbody>
                {
                    this.state.groups
                    .sort((a, b) => a.bookmark_order-b.bookmark_order)
                    .map(group => {
                        return (
                        <tr key={`group-${group.id}`}>
                            <td><input type="checkbox" checked={group.selected} onChange={() => { this.toggleSelect(group.id) }} /></td>
                            <td>
                                <a href={`https://facebook.com/${group.id}`} target="_blank">
                                    <img src={group.icon} alt={group.name} /> {group.name}
                                </a>
                            </td>
                        </tr>
                        )
                    })
                }
                </tbody>
            </table>
            <button className="floating-right button" onClick={() => this.setState({ step: "post" })}>Write Post &raquo;</button>
        </div>
        )
    }
    
    changePayload(e) {
        const target = e.target
        let payload = this.state.payload
        payload[target.name] = target.value
        this.setState({ payload })
    }

    validatePayload() {
        const payload = this.state.payload;
        if (payload.link) {
            payload.link = payload.link.trim()
        }

        if (payload.message) {
            payload.message = payload.message.trim();
        }

        if (!payload.message && !payload.link) {
            alert("Please, fill all fields!")
            return
        }

        this.setState({ step: "checkout" })
    }

    renderPost() {
        return (
        <div>
            <button className="floating-left button" onClick={() => this.setState({ step: "group" })}>&laquo; Select Groups</button>
            <div className="row">
                <div className="column">
                    <fieldset>
                        <label>Link</label>
                        <input type="url" name="link" value={this.state.payload.link} onChange={e => this.changePayload(e)} />
                        
                        <label>Text</label>
                        <textarea name="message" value={this.state.payload.message} onChange={e => this.changePayload(e)}/>
                    </fieldset>
                </div>
            </div>
            <button className="floating-right button" onClick={() => this.validatePayload() }>Checkout &raquo;</button>
        </div>
        )
    }
    
    renderCheckout() {
        const groups = this.state.groups.filter(a => a.selected)
        return (
            <div>
                <button className="floating-left button" disabled={this.state.publishing} onClick={() => this.setState({ step: "post" })}>&laquo; Write Post</button>
                <div className="row">
                    <div className="column">
                        <label>Link</label>
                        <p>{this.state.payload.link}</p>
                        <label>Text</label>
                        <p>{this.state.payload.message}</p>
                        <hr/>
                    </div>
                </div>
                <div className="row">
                    <div className="column">
                        <table>
                            <thead>
                                <tr>
                                    <th colSpan="2">Groups Selected ({groups.length})</th>
                                </tr>
                            </thead>
                            <tbody>
                            {
                                groups
                                .sort((a, b) => a.bookmark_order-b.bookmark_order)
                                .map(group => {
                                    return (
                                    <tr key={`group-${group.id}`}>
                                        <td>
                                            <a href={`https://facebook.com/${group.id}`} target="_blank">
                                                <img src={group.icon} alt={group.name} /> {group.name}
                                            </a>
                                        </td>
                                        <td>{this.renderPublishButton(group)}</td>
                                    </tr>
                                    )
                                })
                            }
                            </tbody>
                        </table>
                    </div>
                </div>
                <button className="floating-right button" disabled={this.state.publishing} onClick={() => this.publish()}>Publish &raquo;</button>
            </div>
        )
    }
    
    reset() {
        const groups = this.state.groups.map(group => {
            delete group.error;
            delete group.selected;
            delete group.post_id;

            return group;
        })

        this.setState({
            groups,
            step: "group",
            loading: false,
            publishing: false,
            payload: { message: '', link: '' },
        })
    }

    renderFinish() {
        const groups = this.state.groups.filter(e => e.selected);
        const success = groups.filter(e => !!e.post_id).length
        const errors = groups.filter(e => !!e.error).length
        return (
            <div>
                <button className="floating-left button" onClick={() => this.reset()}>&laquo; Restart</button>

                <div className="row reports">
                    <div className="column column-50 report-success">
                        <h4>{ success }</h4>
                        <p>posts published</p>
                    </div>
                    <div className="column column-50 report-error">
                        <h4>{ errors }</h4>
                        <p>posts failed</p>
                    </div>
                </div>
            </div>
        )  
    }

    renderPublishButton(group) {
        if (group.error) {
            return <span>{group.error.message}</span>;
        }

        if (!this.state.publishing) {
            return 
        }

        return null
    }

    publish() {
        const randomTime = (min, max) => Math.random() * (max - min) + min;
        const groups = this.state.groups.filter(a => a.selected);
        this.setState({ publishing: true }, () => {
            Promise.all(
                groups.map((group, index) => {
                    return new Promise((resolve) => {
                        setTimeout(() => {
                            this.facebook.api(`${group.id}/feed`, 'post', this.state.payload)
                                .then((r) => resolve({
                                    response: r,
                                    groupId: group.id
                                }))
                                .catch((r) => resolve({
                                    response: r,
                                    groupId: group.id
                                }))
                        }, randomTime(600, 1400) * index)
                    })
                })
            ).then(results => {
                let groups = this.state.groups;
                let newGroups = groups;
                results.forEach(item => {
                    newGroups = groups.map(group => {
                        if (group.id === item.groupId) {
                            const { response } = item;
                            if (!response || response.error) {
                                group.error = response.error   
                            } else {
                                group.post_id = response.id
                            }
                        }
                        return group
                    })
                })

                this.setState({ groups: newGroups, publishing: false, step: "finish" })
            })
        })
    }

    renderPublisher() {
        return (
        <div>
            <div className="row">
                <div className="column">
                    <h2>Hello { this.state.user.name},</h2>
                    { this.state.step === "group" ? <h4>Please select some groups to send a link or message</h4> : null }
                    { this.state.step === "group" && this.renderGroups() }

                    { this.state.step === "post" ? <h4>Write your message or paste a link to share</h4> : null }
                    { this.state.step === "post" && this.renderPost() }

                    { this.state.step === "checkout" ? <h4>Check out if everything is right</h4> : null }
                    { this.state.step === "checkout" && this.renderCheckout() }

                    { this.state.step === "finish" ? <h3>Thanks for using <strong>Facebook Mass Publisher v2</strong>.</h3> : null }
                    { this.state.step === "finish" && this.renderFinish() }
                </div>
            </div>
        </div>
        )
    }
    
    renderContent() {
        if (!this.state.user) {
            return;
        }
        
        return (
        <section className="publisher">
            <div className="container">
                <div className="row">
                    <div className="column">
                    { this.state.loading ? this.renderLoading() : this.renderPublisher() }
                    </div>
                </div>
            </div>
        </section>
        )
    }
    
    componentWillMount() {
        FB.init({ appId });
        FB.getLoginStatus();
    }
    
    render() {
        return (
        <main className="wrapper">
            <header>
                <div className="container">
                    <div className="row">
                        <div className="column">
                            <h1 className="title">Facebook Mass Publisher</h1>
                            <p className="description">powered by <a href="https://github.com/gpedro">@gpedro</a></p>
                            { this.renderFacebookButton() }
                        </div>
                    </div>
                </div>
            </header>
            { this.renderContent() }
        </main>
        );
    }
}

export default App;
