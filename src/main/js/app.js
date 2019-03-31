'use strict';

const React = require('react');
const ReactDOM = require('react-dom');
const client = require('./client');

const follow = require('./follow');  // function to hop multiple links by "rel"

const root = '/api';

class App extends React.Component {

    constructor(props) {
        super(props);
        this.state = {patients: [], attributes: [], pageSize: 2, links: {}};
        this.updatePageSize = this.updatePageSize.bind(this);
        this.onCreate = this.onCreate.bind(this);
        this.onDelete = this.onDelete.bind(this);
        this.onNavigate = this.onNavigate.bind(this);
    }

    //FOLLOW
    loadFromServer(pageSize) {
        follow(client, root, [
            {rel: 'patients', params: {size: pageSize}}]
        ).then(patientCollection => {
            return client({
                method: 'GET',
                path: patientCollection.entity._links.profile.href,
                headers: {'Accept': 'application/schema+json'}
            }).then(schema => {
                this.schema = schema.entity;
                return patientCollection;
            });
        }).done(patientCollection => {
            this.setState({
                patients: patientCollection.entity._embedded.patients,
                attributes: Object.keys(this.schema.properties),
                pageSize: pageSize,
                links: patientCollection.entity._links
            });
        });
    }

    //END OF FOLLOW

    //CREATE
    onCreate(newPatient) {
        follow(client, root, ['patients']).then(patientCollection => {
            return client({
                method: 'POST',
                path: patientCollection.entity._links.self.href,
                entity: newPatient,
                headers: {'Content-Type': 'application/json'}
            })
        }).then(response => {
            return follow(client, root, [
                {rel: 'patients', params: {'size': this.state.pageSize}}]);
        }).done(response => {
            if (typeof response.entity._links.last !== "undefined") {
                this.onNavigate(response.entity._links.last.href);
            } else {
                this.onNavigate(response.entity._links.self.href);
            }
        });
    }

    //END OF CREATE

    //DELETE
    onDelete(patient) {
        client({method: 'DELETE', path: patient._links.self.href}).done(response => {
            this.loadFromServer(this.stage.pageSize);
        });
    }

    //END of DELETE

    //NAVIGATE
    onNavigate(navUri) {
        client({method: 'GET', path: navUri}).done(patientCollection => {
            this.setState({
                patients: patientCollection.entity._embedded.patients,
                attributes: this.state.attributes,
                pageSize: this.state.pageSize,
                links: patientCollection.entity._links
            });
        });
    }

    //END OF NAVIGATE

    // update-page
    updatePageSize(pageSize) {
        if (pageSize !== this.state.pageSize) {
            this.loadFromServer(pageSize);
        }
    }

    // end of update-page

    //FOLLOW-1
    componentDidMount() {
        this.loadFromServer(this.state.pageSize);
    }

    render() {
        return (
            <div>
                <CreateDialog attributes={this.state.attributes} onCreate={this.onCreate}/>
                <PatientList patients={this.state.patients}
                                    links={this.state.links}
                                    pageSize={this.state.pageSize}
                                    onNavigate={this.onNavigate}
                                    onDelete={this.onDelete}
                                    updatePageSize={this.updatePageSize}/>
            </div>
        )
    }
}

class CreateDialog extends React.Component {

    constructor(props) {
        super(props);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleSubmit(e) {
        e.preventDefault();
        const newPatient = {};
        this.props.attributes.forEach(attribute => {
            newPatient[attribute] = ReactDOM.findDOMNode(this.refs[attribute]).value.trim();
        });
        this.props.onCreate(newPatient);

        // clear out the dialog's inputs
        this.props.attributes.forEach(attributes => {
            ReactDOM.findDOMNode(this.refs[attributes]).value = '';
        });

        // Navigate away from the dialog to hide it
        window.location = "#";
    }

    render() {
        const inputs = this.props.attributes.map(attributes =>
            <p key={attributes}>
                <input type="text" placeholder={attributes} ref={attributes} className="field"/>
            </p>
        );

        return (
            <div>
                <a href="#createPatient">Create</a>

                <div id="createPatient" className="modalDialog">
                    <div>
                        <a href="#" title="Close" className="close">X</a>

                        <h2>Create new patient</h2>

                        <form>
                            {inputs}
                            <button onClick={this.handleSubmit}>Create</button>
                        </form>
                    </div>
                </div>
            </div>
        )
    }


}

class PatientList extends React.Component {

    constructor(props) {
        super(props);
        this.handleNavFirst = this.handleNavFirst.bind(this);
        this.handleNavPrev = this.handleNavPrev.bind(this);
        this.handleNavNext = this.handleNavNext.bind(this);
        this.handleNavLast = this.handleNavLast.bind(this);
        this.handleInput = this.handleInput.bind(this);
    }

    //handle-page-size-updates
    handleInput(e) {
        e.preventDefault();
        const pageSize = ReactDOM.findDOMNode(this.refs.pageSize).value;
        if (/^[0-9]+$/.test(pageSize)) {
            this.props.updatePageSize(pageSize);
        } else {
            ReactDOM.findDOMNode(this.refs.pageSize).value =
                pageSize.substring(0, pageSize.length - 1);
        }
    }

    //end of handle-page-size-update

    //HANDLE-NAV[]
    handleNavFirst(e) {
        e.preventDefault();
        this.props.onNavigate(this.props.links.first.href);
    }

    handleNavPrev(e) {
        e.preventDefault();
        this.props.onNavigate(this.props.links.prev.href);
    }

    handleNavNext(e) {
        e.preventDefault();
        this.props.onNavigate(this.props.links.next.href);
    }

    handleNavLast(e) {
        e.preventDefault();
        this.props.onNavigate(this.props.links.last.href);
    }

    //END OF HANDLE-NAV

    //PATIENT-LIST-RENDER
    render() {
        const patients = this.props.patients.map(patient =>
            <Patient key={patient._links.self.href} patient={patient} onDelete={this.props.onDelete}/>
        );

        const navLinks = [];
        if ("first" in this.props.links) {
            navLinks.push(<button key="first" onClick={this.handleNavFirst}>&lt;&lt;</button>);
        }
        if ("prev" in this.props.links) {
            navLinks.push(<button key="prev" onClick={this.handleNavPrev}>&lt;</button>);
        }
        if ("next" in this.props.links) {
            navLinks.push(<button key="next" onClick={this.handleNavNext}>&gt;</button>);
        }
        if ("last" in this.props.links) {
            navLinks.push(<button key="last" onClick={this.handleNavLast}>&gt;&gt;</button>);
        }

        return (
            <div>
                <input ref="pageSize" defaultValue={this.props.pageSize} onInput={this.handleInput}/>
                <table>
                    <tbody>
                        <tr>
                            <th>First Name</th>
                            <th>Last Name</th>
                            <th>Description</th>
                            <th></th>
                        </tr>
                        {patients}
                    </tbody>
                </table>
                <div>
                    {navLinks}
                </div>
            </div>
        )
    }
}

//END OF PATIENT-LIST-RENDER


class Patient extends React.Component {

    constructor(props) {
        super(props);
        this.handleDelete = this.handleDelete.bind(this);
    }

    handleDelete() {
        this.props.onDelete(this.props.patient);
    }

    render() {
        return (
            <tr>
                <td>{this.props.patient.firstName}</td>
                <td>{this.props.patient.lastName}</td>
                <td>{this.props.patient.description}</td>
                <td>
                    <button onClick={this.handleDelete}>Delete</button>
                </td>
            </tr>
        )
    }
}

ReactDOM.render(
    <App/>,
    document.getElementById('react')
)